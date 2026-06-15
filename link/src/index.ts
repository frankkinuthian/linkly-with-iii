/**
 * link worker — a URL-shortener microservice running on the III engine.
 *
 * Architecture after Ch. 4 ("Make it durable"):
 *
 *   Core functions:
 *     • link::create           — shorten a URL, persist to DB + cache, publish event
 *     • link::update           — change a link's target, publish durable event
 *     • link::resolve          — look up original URL (cache-first, DB fallback)
 *     • link::record_click     — insert a click row (consumed from a queue)
 *     • link::on_link_updated  — subscriber that refreshes the cache on updates
 *
 *   HTTP handlers (thin validation → delegate → respond):
 *     • http::create   → POST /links        — create a short link
 *     • http::update   → PUT  /links/:code  — update a link's target URL
 *     • http::redirect → GET  /s/:code      — resolve & 302 redirect
 *
 *   Durability patterns introduced in this chapter:
 *     1. Queue:        click recording is enqueued (not inline) so redirects stay fast
 *     2. Pub/Sub:      link.created is broadcast (fire-and-forget) for best-effort consumers
 *     3. Durable P/S:  link.updated uses iii::durable::publish so the cache subscriber
 *                       is guaranteed delivery (missed event = stale cache)
 */

import { registerWorker, TriggerAction } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

// The logical database name — must match the key under `databases:` in
// the database worker's config inside config.yaml.
const DB = "primary";

// ===========================================================================
// 1. CONNECT TO THE ENGINE
// ===========================================================================
// registerWorker opens a persistent WebSocket to the III engine.
// The engine is the central message router — all worker↔worker communication
// passes through it. III_URL is injected by `iii dev`; the fallback is the
// default local address.
const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "link", // must match the name in iii.worker.yaml
});

// ===========================================================================
// 2. OBSERVABILITY
// ===========================================================================
// Logger hooks into iii-observability. Calls like logger.info() are captured
// by the engine and exported per config.yaml (console, memory, OTLP, etc.)
const logger = new Logger();

// ===========================================================================
// 3. HELPER: SHORT CODE GENERATOR
// ===========================================================================
// 36^6 ≈ 2.18 billion possible codes. Good enough for a tutorial shortener.
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function makeCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

// ===========================================================================
// 4. DOMAIN FUNCTIONS
// ===========================================================================

// ---------------------------------------------------------------------------
// link::create — shorten a URL
// ---------------------------------------------------------------------------
// Writes to both DB (durable) and iii-state (cache), then publishes a
// "link.created" event via regular pub/sub (iii-pubsub). Regular pub/sub is
// fine here because the only consumer is a best-effort daily counter — an
// occasional missed event doesn't corrupt state.
worker.registerFunction(
  "link::create",
  async (payload: { url: string; code?: string }) => {
    const code = payload.code ?? makeCode();

    // Normalize: ensure protocol so Location headers work as absolute URLs
    const url = /^https?:\/\//i.test(payload.url)
      ? payload.url
      : `https://${payload.url}`;

    // Durable write — survives engine restarts
    await worker.trigger({
      function_id: "database::execute",
      payload: {
        db: DB,
        sql: "INSERT INTO links (code, url, created_at) VALUES (?, ?, ?)",
        params: [code, url, new Date().toISOString()],
      },
    });

    // Hot cache — makes subsequent resolves instant
    await worker.trigger({
      function_id: "state::set",
      payload: { scope: "links", key: code, value: { url } },
    });

    // Broadcast to any subscriber (analytics counter, etc.)
    // Uses regular pub/sub (iii-pubsub) — fire-and-forget fan-out
    await worker.trigger({
      function_id: "publish",
      payload: { topic: "link.created", data: { code, url } },
    });

    logger.info("link created", { code, url });
    return { code, url };
  },
);

// ---------------------------------------------------------------------------
// link::update — change where a short code points
// ---------------------------------------------------------------------------
// Updates the DB row, then publishes via DURABLE pub/sub (iii::durable::publish,
// served by iii-queue). Durable because a missed event would leave the cache
// pointing at the old URL — that's state corruption, not a minor miss.
worker.registerFunction(
  "link::update",
  async (payload: { code: string; url: string }) => {
    const url = /^https?:\/\//i.test(payload.url)
      ? payload.url
      : `https://${payload.url}`;

    await worker.trigger({
      function_id: "database::execute",
      payload: {
        db: DB,
        sql: "UPDATE links SET url = ? WHERE code = ?",
        params: [url, payload.code],
      },
    });

    // Durable publish — guaranteed delivery to subscribers
    await worker.trigger({
      function_id: "iii::durable::publish",
      payload: { topic: "link.updated", data: { code: payload.code, url } },
    });

    return { code: payload.code, url };
  },
);

// ---------------------------------------------------------------------------
// link::resolve — look up the original URL for a short code
// ---------------------------------------------------------------------------
// Two-tier read:
//   1. iii-state (in-memory cache) — fast path, no DB hit
//   2. database (SQLite) — fallback, then backfill the cache for next time
worker.registerFunction("link::resolve", async (payload: { code: string }) => {
  // Tier 1: cache
  const cached = await worker.trigger<
    { scope: string; key: string },
    { url: string } | null
  >({
    function_id: "state::get",
    payload: { scope: "links", key: payload.code },
  });

  if (cached) {
    logger.info("link resolved (cache hit)", { code: payload.code });
    return { url: cached.url };
  }

  // Tier 2: database
  const { rows } = await worker.trigger<
    { db: string; sql: string; params: string[] },
    { rows: Array<{ url: string }> }
  >({
    function_id: "database::query",
    payload: {
      db: DB,
      sql: "SELECT url FROM links WHERE code = ?",
      params: [payload.code],
    },
  });

  const url = rows[0]?.url ?? null;

  // Backfill cache on miss so next resolve is instant
  if (url) {
    await worker.trigger({
      function_id: "state::set",
      payload: { scope: "links", key: payload.code, value: { url } },
    });
  }

  logger.info("link resolved (db)", { code: payload.code, found: !!url });
  return { url };
});

// ---------------------------------------------------------------------------
// link::record_click — insert a click row into the clicks table
// ---------------------------------------------------------------------------
// The function itself is unchanged from Ch. 3. What changed is HOW it's
// invoked: http::redirect now enqueues the call onto the "clicks" queue
// (via TriggerAction.Enqueue) instead of calling it inline. The queue drains
// in the background with retries + dead-letter on repeated failure.
worker.registerFunction(
  "link::record_click",
  async (payload: { code: string; clicked_at: string }) => {
    await worker.trigger({
      function_id: "database::execute",
      payload: {
        db: DB,
        sql: "INSERT INTO clicks (code, clicked_at) VALUES (?, ?)",
        params: [payload.code, payload.clicked_at],
      },
    });
    return { recorded: true };
  },
);

// ===========================================================================
// 5. REACTIVE STATE: CACHE REFRESH VIA DURABLE SUBSCRIBER
// ===========================================================================
// Rather than coupling link::update to the cache directly, we subscribe to
// the "link.updated" topic. When a link's URL changes, this function fires
// and refreshes the cached entry. Because we use a durable subscriber
// (type: "durable:subscriber"), delivery is guaranteed even if the worker
// was temporarily down when the event was published.
worker.registerFunction(
  "link::on_link_updated",
  async (data: { code: string; url: string }) => {
    await worker.trigger({
      function_id: "state::set",
      payload: { scope: "links", key: data.code, value: { url: data.url } },
    });
  },
);

worker.registerTrigger({
  type: "durable:subscriber",
  function_id: "link::on_link_updated",
  config: { topic: "link.updated" },
});

// ===========================================================================
// 6. HTTP LAYER
// ===========================================================================
// HTTP handlers are thin: validate input → delegate to a domain function →
// shape the response. registerTrigger binds each handler to an HTTP route
// on the iii-http worker.
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /links — create a short link
// ---------------------------------------------------------------------------
worker.registerFunction("http::create", async (req) => {
  const { url, code } = req.body ?? {};

  if (!url) {
    return {
      status_code: 400,
      body: { error: "Missing url." },
      headers: { "Content-Type": "application/json" },
    };
  }

  const link = await worker.trigger<
    { url: string; code?: string },
    { code: string; url: string }
  >({
    function_id: "link::create",
    payload: { url, code },
  });

  return {
    status_code: 201,
    body: link,
    headers: { "Content-Type": "application/json" },
  };
});

worker.registerTrigger({
  type: "http",
  function_id: "http::create",
  config: { api_path: "/links", http_method: "POST" },
});

// ---------------------------------------------------------------------------
// PUT /links/:code — update a link's target URL
// ---------------------------------------------------------------------------
worker.registerFunction("http::update", async (req) => {
  const code = req.path_params.code;
  const url = req.body?.url;

  if (!url) {
    return {
      status_code: 400,
      body: { error: 'missing "url"' },
      headers: { "Content-Type": "application/json" },
    };
  }

  const link = await worker.trigger<
    { code: string; url: string },
    { code: string; url: string }
  >({
    function_id: "link::update",
    payload: { code, url },
  });

  return {
    status_code: 200,
    body: link,
    headers: { "Content-Type": "application/json" },
  };
});

worker.registerTrigger({
  type: "http",
  function_id: "http::update",
  config: { api_path: "/links/:code", http_method: "PUT" },
});

// ---------------------------------------------------------------------------
// GET /s/:code — resolve and redirect
// ---------------------------------------------------------------------------
// This is the hot path. Thanks to Ch. 4, the click recording no longer
// blocks the redirect — it's enqueued onto the "clicks" queue and drained
// in the background by iii-queue.
worker.registerFunction("http::redirect", async (req) => {
  const code = req.path_params.code;

  const { url } = await worker.trigger<
    { code: string },
    { url: string | null }
  >({
    function_id: "link::resolve",
    payload: { code },
  });

  if (!url) {
    return {
      status_code: 404,
      body: { error: "Link NOT Found!" },
      headers: { "Content-Type": "application/json" },
    };
  }

  // Enqueue the click write — redirect returns immediately.
  // TriggerAction.Enqueue routes through iii-queue's "clicks" queue.
  // The queue handles retries (max_retries: 5) and dead-lettering.
  await worker.trigger({
    function_id: "link::record_click",
    payload: { code, clicked_at: new Date().toISOString() },
    action: TriggerAction.Enqueue({ queue: "clicks" }),
  });

  // 302 Found — browser follows the Location header
  return { status_code: 302, headers: { Location: url } };
});

worker.registerTrigger({
  type: "http",
  function_id: "http::redirect",
  config: { api_path: "/s/:code", http_method: "GET" },
});

// ===========================================================================
// 7. DATABASE SCHEMA BOOTSTRAP
// ===========================================================================
// Runs once on startup. Idempotent via CREATE TABLE IF NOT EXISTS.
// The worker owns its schema — no external migrations needed.
// ===========================================================================

async function ensureSchema(): Promise<void> {
  await worker.trigger({
    function_id: "database::execute",
    payload: {
      db: DB,
      sql: "CREATE TABLE IF NOT EXISTS links (code TEXT PRIMARY KEY, url TEXT NOT NULL, created_at TEXT NOT NULL)",
    },
  });

  await worker.trigger({
    function_id: "database::execute",
    payload: {
      db: DB,
      sql: "CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, clicked_at TEXT NOT NULL)",
    },
  });
}

ensureSchema()
  .then(() => logger.info("database: ready"))
  .catch((err) =>
    logger.error("database: schema init failed", { error: String(err) }),
  );

// ===========================================================================
// 8. STARTUP
// ===========================================================================
logger.info("Link Worker Ready");

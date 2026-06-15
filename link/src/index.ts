/**
 * link worker — a URL-shortener microservice running on the III engine.
 *
 * In III, a "worker" is an isolated unit of logic that connects to the
 * engine over WebSocket. Workers expose named functions (like "link::create")
 * that any other worker or external client can call through the engine.
 *
 * This worker exposes three core functions:
 *   • link::create       — shorten a URL, persist to DB + cache in iii-state
 *   • link::resolve      — look up the original URL (cache-first, DB fallback)
 *   • link::record_click — log a click event to the clicks table
 *
 * And two HTTP handler functions wired to triggers:
 *   • http::create   → POST /links      — create a short link via JSON body
 *   • http::redirect → GET  /s/:code    — resolve & 302 redirect
 */

import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

// The database identifier used in all database::execute / database::query calls.
// This must match the db name configured in the iii-database worker's config.
const DB = "primary";

// ---------------------------------------------------------------------------
// 1. CONNECT TO THE ENGINE
// ---------------------------------------------------------------------------
// registerWorker opens a persistent WebSocket connection to the III engine.
// The engine is the central hub that routes messages between workers.
// III_URL comes from the environment (set by `iii dev`); the fallback is the
// default local engine address.
const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "link", // must match the name in iii.worker.yaml
});

// ---------------------------------------------------------------------------
// 2. OBSERVABILITY
// ---------------------------------------------------------------------------
// Logger connects to the iii-observability worker running in the engine.
// Any logger.info / logger.error calls will show in the III dashboard and
// are exported according to config.yaml's observability settings.
const logger = new Logger();

// ---------------------------------------------------------------------------
// 3. HELPER: SHORT CODE GENERATOR
// ---------------------------------------------------------------------------
// We use a 6-character alphanumeric code (36^6 ≈ 2.18 billion combinations).
// For a toy project this is fine — a production shortener would check for
// collisions against the database before returning.
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function makeCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return s;
}

// ---------------------------------------------------------------------------
// 4. FUNCTION: link::create
// ---------------------------------------------------------------------------
// Publishes a callable function on the engine under "link::create".
// Any other worker or external HTTP request (via iii-http) can invoke it.
//
// Payload:
//   { url: string, code?: string }
//   - url  — the destination URL to shorten
//   - code — (optional) a custom short code; auto-generated if omitted
//
// Returns:
//   { code: string, url: string }
worker.registerFunction(
  "link::create",
  async (payload: { url: string; code?: string }) => {
    // Use the caller-supplied code or generate a random one
    const code = payload.code ?? makeCode();

    // Normalize the URL — ensure it has a protocol so redirect Location
    // headers work correctly (browsers treat "example.com" as a relative path)
    const url = /^https?:\/\//i.test(payload.url)
      ? payload.url
      : `https://${payload.url}`;

    // -----------------------------------------------------------------------
    // Persist to the database (durable, survives engine restarts)
    // database::execute is provided by the iii-database built-in worker.
    // We INSERT the link row with a timestamp for auditing.
    // -----------------------------------------------------------------------
    await worker.trigger({
      function_id: "database::execute",
      payload: {
        db: DB,
        sql: "INSERT INTO links (code, url, created_at) VALUES (?, ?, ?)",
        params: [code, url, new Date().toISOString()],
      },
    });

    // -----------------------------------------------------------------------
    // Cache in iii-state (fast in-memory lookup for subsequent resolves)
    // state::set writes to the KV store configured in config.yaml.
    // This acts as a read-through cache — link::resolve checks here first.
    // -----------------------------------------------------------------------
    await worker.trigger({
      function_id: "state::set",
      payload: {
        scope: "links", // namespace within the key-value store
        key: code, // e.g. "a3f9x2"
        value: { url }, // the data to store
      },
    });

    logger.info("Link Created: ", { code, url });

    return { code, url };
  },
);

// ---------------------------------------------------------------------------
// 5. FUNCTION: link::resolve
// ---------------------------------------------------------------------------
// Given a short code, resolve the original URL.
// Uses a two-tier lookup strategy:
//   1. Check iii-state (in-memory cache) — fast path
//   2. Fall back to the database — slower but durable
// If found in DB but not cache, backfill the cache for next time.
// Returns { url: string | null } — null means the code doesn't exist.
worker.registerFunction("link::resolve", async (payload: { code: string }) => {
  // --- Tier 1: Check the in-memory cache (iii-state) ---
  const cached = await worker.trigger<
    { scope: string; key: string },
    { url: string } | null
  >({
    function_id: "state::get",
    payload: { scope: "links", key: payload.code },
  });

  // Cache hit — return immediately without touching the database
  if (cached) {
    logger.info("link resolved", { code: payload.code, found: true });
    return { url: cached.url };
  }

  // --- Tier 2: Cache miss — query the database ---
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

  // Backfill the cache so the next resolve for this code is instant
  if (url) {
    await worker.trigger({
      function_id: "state::set",
      payload: { scope: "links", key: payload.code, value: { url } },
    });
  }

  logger.info("Link Resolved", { code: payload.code, found: !!url });
  return { url };
});

// ---------------------------------------------------------------------------
// 6. FUNCTION: link::record_click
// ---------------------------------------------------------------------------
// Tracks analytics — inserts a row into the clicks table each time
// a short link is visited. Called by the redirect handler below.
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

// ---------------------------------------------------------------------------
// 7. STARTUP LOG
// ---------------------------------------------------------------------------
// This runs once the worker module finishes loading. By this point all
// core functions are registered and the worker is ready to accept calls.
logger.info("Link Worker Ready");

// ===========================================================================
// HTTP LAYER
// ===========================================================================
// Below we define HTTP handler functions and bind them to routes using
// registerTrigger. This is how iii-http knows which function to call for
// each incoming HTTP request. The handler receives a request object and
// returns a response shape ({ status_code, body?, headers? }).
// ===========================================================================

// ---------------------------------------------------------------------------
// 8. HTTP HANDLER: POST /links — Create a short link
// ---------------------------------------------------------------------------
// Validates the body, delegates to link::create, and returns 201 + JSON.
worker.registerFunction("http::create", async (req) => {
  const { url, code } = req.body ?? {};

  // Require at minimum a URL to shorten
  if (!url) {
    return {
      status_code: 400,
      body: { error: "Missing url." },
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  // Delegate to our core link::create function (through the engine).
  // This keeps the HTTP handler thin — just validation and response shaping.
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
    headers: {
      "Content-Type": "application/json",
    },
  };
});

// Bind POST /links → http::create
worker.registerTrigger({
  type: "http",
  function_id: "http::create",
  config: {
    api_path: "/links",
    http_method: "POST",
  },
});

// ---------------------------------------------------------------------------
// 9. HTTP HANDLER: GET /s/:code — Redirect to the original URL
// ---------------------------------------------------------------------------
// Extracts the code from the path, resolves it, records a click, and
// returns a 302 redirect. Returns 404 if the code doesn't exist.
worker.registerFunction("http::redirect", async (req) => {
  // :code from the route pattern is available in path_params
  const code = req.path_params.code;

  // Look up the original URL
  const { url } = await worker.trigger<
    { code: string },
    { url: string | null }
  >({
    function_id: "link::resolve",
    payload: { code },
  });

  // Unknown code — return a 404
  if (!url) {
    return {
      status_code: 404,
      body: { error: "Link NOT Found!" },
      headers: { "Content-Type": "application/json" },
    };
  }

  // Fire-and-forget: record the click for analytics
  await worker.trigger({
    function_id: "link::record_click",
    payload: { code, clicked_at: new Date().toISOString() },
  });

  // 302 Found — the Location header tells the browser where to go
  return { status_code: 302, headers: { Location: url } };
});

// Bind GET /s/:code → http::redirect
worker.registerTrigger({
  type: "http",
  function_id: "http::redirect",
  config: {
    api_path: "/s/:code",
    http_method: "GET",
  },
});

// ===========================================================================
// DATABASE SCHEMA BOOTSTRAP
// ===========================================================================
// On startup, ensure the required tables exist. This is idempotent thanks
// to "CREATE TABLE IF NOT EXISTS" — safe to run every time the worker starts.
// ===========================================================================

async function ensureSchema(): Promise<void> {
  // Links table — stores the code→url mapping with a creation timestamp
  await worker.trigger({
    function_id: "database::execute",
    payload: {
      db: DB,
      sql: "CREATE TABLE IF NOT EXISTS links (code TEXT PRIMARY KEY, url TEXT NOT NULL, created_at TEXT NOT NULL)",
    },
  });

  // Clicks table — append-only log of every redirect, for analytics
  await worker.trigger({
    function_id: "database::execute",
    payload: {
      db: DB,
      sql: "CREATE TABLE IF NOT EXISTS clicks (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL, clicked_at TEXT NOT NULL)",
    },
  });
}

// Run schema migration at startup
ensureSchema()
  .then(() => logger.info("Database Ready!"))
  .catch((err) => logger.error("Database Error", { error: String(err) }));

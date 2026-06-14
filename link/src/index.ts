/**
 * link worker — a URL-shortener microservice running on the III engine.
 *
 * In III, a "worker" is an isolated unit of logic that connects to the
 * engine over WebSocket. Workers expose named functions (like "link::create")
 * that any other worker or external client can call through the engine.
 *
 * This worker exposes two functions:
 *   • link::create  — shorten a URL, persist the mapping via iii-state
 *   • link::resolve — look up the original URL for a given short code
 */

import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

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
// collisions against iii-state before returning.
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
// registerFunction publishes a callable function on the engine under
// the name "link::create". Any other worker or external HTTP request
// (via iii-http) can invoke it by name.
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

    // Persist the mapping by triggering a function on the iii-state worker.
    // worker.trigger sends a message *through the engine* — we never import
    // or directly call iii-state. The engine knows where iii-state lives and
    // routes the message for us.
    await worker.trigger({
      function_id: "state::set", // target function on iii-state
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
// Given a short code, look up the original URL from iii-state.
// Returns { url: string | null } — null means the code doesn't exist.
worker.registerFunction("link::resolve", async (payload: { code: string }) => {
  // worker.trigger<RequestType, ResponseType> lets us type-hint the call.
  // "state::get" returns whatever value was stored, or null if missing.
  const stored = await worker.trigger<
    { scope: string; key: string },
    { url: string } | null
  >({
    function_id: "state::get",
    payload: {
      scope: "links",
      key: payload.code,
    },
  });

  // Return the URL (or null so the caller can show a 404)
  return { url: stored?.url ?? null };
});

// ---------------------------------------------------------------------------
// 6. STARTUP LOG
// ---------------------------------------------------------------------------
// This runs once the worker module finishes loading. By this point all
// functions are registered and the worker is ready to accept calls.
logger.info("Link Worker Ready");

/**
 * ----------------------------------------------------------------------------
 * Expose your functions over HTTP
 */

// Create a function to handle new links
worker.registerFunction("http::create", async (req) => {
  const { url, code } = req.body ?? {};

  if (!url) {
    return {
      status_code: 400,
      body: { error: "Missing url." },
      headers: {
        "Content-Type": "application/json",
      },
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
    headers: {
      "Content-Type": "application/json",
    },
  };
});

// ---------------------------------------------------------------------------
// Bind the create function to a Trigger
// ---------------------------------------------------------------------------
worker.registerTrigger({
  type: "http",
  function_id: "http::create",
  config: {
    api_path: "/links",
    http_method: "POST",
  },
});

// ---------------------------------------------------------------------------
// Create a function to handle redirects
// ---------------------------------------------------------------------------
worker.registerFunction("http::redirect", async (req) => {
  const code = req.path_params.code;

  const { url } = await worker.trigger<
    {
      code: string;
    },
    {
      url: string | null;
    }
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

  return { status_code: 302, headers: { Location: url } };
});

// ---------------------------------------------------------------------------
// Bind the redirect function to a Trigger
// ---------------------------------------------------------------------------
worker.registerTrigger({
  type: "http",
  function_id: "http::redirect",
  config: { 
    api_path: "/s/:code", 
    http_method: "GET" 
  },
});

import { registerWorker, TriggerAction } from "iii-sdk";
import { Logger } from "@iii-dev/observability";
import { WebSocketServer, WebSocket } from "ws";

const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "relay",
});
const logger = new Logger();

// ─── WebSocket Server ────────────────────────────────────────────────────────
// Browsers connect here to receive live events.
const PORT = parseInt(process.env.RELAY_PORT ?? "4000", 10);
const wss = new WebSocketServer({ port: PORT });

const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);
  logger.info("relay client connected", { total: clients.size });

  ws.on("close", () => {
    clients.delete(ws);
    logger.info("relay client disconnected", { total: clients.size });
  });

  ws.on("error", () => {
    clients.delete(ws);
  });
});

// ─── Broadcast helper ────────────────────────────────────────────────────────
function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// ─── Subscribe to click events ───────────────────────────────────────────────
worker.registerFunction(
  "relay::on_click",
  async (data: { code: string; clicked_at: string }) => {
    broadcast("click", data);
    return null;
  },
);

worker.registerTrigger({
  type: "subscribe",
  function_id: "relay::on_click",
  config: { topic: "link.clicked" },
});

// ─── Subscribe to link created events ────────────────────────────────────────
worker.registerFunction(
  "relay::on_link_created",
  async (data: { code: string; url: string }) => {
    broadcast("link.created", data);
    return null;
  },
);

worker.registerTrigger({
  type: "subscribe",
  function_id: "relay::on_link_created",
  config: { topic: "link.created" },
});

logger.info("relay ready", { port: PORT });

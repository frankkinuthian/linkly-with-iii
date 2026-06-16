import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

// Connect to the iii engine and identify this process as the click-streamer worker
const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "click-streamer",
});
const logger = new Logger();

// Receives click events via pub/sub and pushes them into the "clicks" stream
// so any connected stream subscribers (e.g. dashboards) get live updates.
worker.registerFunction(
  "click-streamer::broadcast",
  async (data: { code: string; clicked_at: string }) => {
    // Write the click into the "clicks" stream, keyed by short-code + timestamp
    await worker.trigger({
      function_id: "stream::set",
      payload: {
        stream_name: "clicks",
        group_id: "all",
        item_id: `${data.code}-${data.clicked_at}`,
        data,
      },
    });
    return {
      streamed: true,
    };
  },
);

// Subscribe to the "link.clicked" pub/sub topic so every new click event
// automatically invokes the broadcast function above.
worker.registerTrigger({
  type: "subscribe",
  function_id: "click-streamer::broadcast",
  config: { topic: "link.clicked" },
});

logger.info("click-streamer ready");

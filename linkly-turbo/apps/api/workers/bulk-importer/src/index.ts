import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

// Connect to the iii engine as the bulk-importer worker
const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "bulk-importer",
});
const logger = new Logger();

// Accepts a channel reader containing CSV data (code,url per row)
// and creates a short link for each valid row via the link::create function.
worker.registerFunction("bulk-importer::import_csv", async (input) => {
  // Read the full CSV payload from the channel stream
  const chunks: Buffer[] = [];
  for await (const chunk of input.reader.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const csv = Buffer.concat(chunks).toString("utf-8");
  const rows = csv.trim().split("\n").slice(1); // skip the header row

  // Create a short link for each CSV row sequentially
  let imported = 0;
  for (const row of rows) {
    const [code, url] = row.split(",");
    if (!url) continue;
    await worker.trigger({
      function_id: "link::create",
      payload: { code: code.trim(), url: url.trim() },
    });
    imported += 1;
  }
  logger.info("Bulk Import Complete: ", { imported });
  return { imported };
});

logger.info("Bulk Importer is ready!");

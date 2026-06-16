> ## Documentation Index
>
> Fetch the complete documentation index at: https://iii.dev/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Ch. 6: Move bulk data with channels

> Send a large amount of data over a channel by bulk-loading links from a CSV with a dedicated importer worker.

Where a stream is for a live trickle of events, a **channel** is for **moving a large amount of data
at once**: a direct streaming pipe between two endpoints, rather than one request and response.
Channels are bidirectional (each end has both a reader and a writer), but here you'll stream in one
direction, uploading a CSV of links. You'll give this its own `bulk-importer` worker so the `link`
worker stays focused on single links.

## Add the worker

Scaffold the importer the same way you scaffolded `link` in Chapter 1:

```bash theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
iii worker init bulk-importer --language typescript
```

## Import a CSV over a channel

The `bulk-importer` worker exposes one function that receives the read end of a channel, streams the
CSV in, and triggers `link::create` from the `link` worker for each row. Replace the generated
`bulk-importer/src/index.ts`:

```typescript bulk-importer/src/index.ts theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
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
  logger.info("bulk import complete", { imported });
  return { imported };
});

logger.info("bulk-importer ready");
```

Register it with your project:

```bash theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
iii worker add ./bulk-importer
```

## See it work

With the engine running, let's bulk-load some links.

<Note>
  Unlike previous chapters this section and Chapter 7 require that you have [node and npm
  installed](https://nodejs.org/en/download/current) locally. This is because we're now creating
  client side code that runs outside of workers.
</Note>

### Upload a CSV

The uploader is a small standalone script that creates the channel, writes the CSV to the writer
end, and hands the reader end to `bulk-importer::import_csv`. `createChannel` returns serializable
`readerRef`/`writerRef` handles you can pass through a normal trigger payload. It is not a worker,
so give it its own throwaway directory outside your project:

```bash theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
mkdir test-channels
cd test-channels
npm init -y
npm pkg set type=module
npm install iii-sdk
```

Save this as `test-channels/import-links.js`:

```javascript import-links.js theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
import { registerWorker } from "iii-sdk";

const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "uploader",
});

const csv = [
  "code,url",
  "mylink,https://iii.dev",
  "mydocslink,https://iii.dev/docs",
].join("\n");

// Create a channel and write the CSV to the writer end.
// NOTE: In iii-sdk v0.19.x, createChannel is exposed as __helpers_create_channel().
// A future SDK release will alias this as worker.createChannel().
const channel = await worker.__helpers_create_channel();
channel.writer.stream.write(Buffer.from(csv));
channel.writer.stream.end();

// Pass the reader ref to the importer so it can stream the CSV from the other end
const result = await worker.trigger({
  function_id: "bulk-importer::import_csv",
  payload: { reader: channel.readerRef },
});
console.log(result);

await worker.shutdown();
```

```bash theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
node import-links.js
```

```json theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
{ "imported": 2 }
```

Both new links resolve immediately:

```bash theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
iii trigger link::resolve code=mydocslink
```

```json theme={"theme":{"light":"catppuccin-latte","dark":"dark-plus"}}
{ "url": "https://iii.dev/docs" }
```

## Conclusion

Linkly can now ingest a file's worth of links in a single streamed upload through a dedicated
`bulk-importer` worker. Next, in [Ch. 7: Bring in the browser](/tutorials/linkly/frontend), you turn
a browser tab into a worker that creates links and subscribes to the live click stream.

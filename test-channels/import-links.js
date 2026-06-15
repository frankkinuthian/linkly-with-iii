import { registerWorker } from "iii-sdk";

const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "uploader",
});

const csv = [
  "code,url",
  "mylink,https://iii.dev",
  "mydocslink,https://iii.dev/docs",
].join("\n");

const channel = await worker.__helpers_create_channel();
channel.writer.stream.write(Buffer.from(csv));
channel.writer.stream.end();

const result = await worker.trigger({
  function_id: "bulk-importer::import_csv",
  payload: { reader: channel.readerRef },
});
console.log(result);

await worker.shutdown();

import "server-only";
import { registerWorker } from "iii-sdk";
import { keys } from "./keys";

const globalForIII = global as unknown as {
  iii: ReturnType<typeof registerWorker>;
};

export const iii =
  globalForIII.iii ||
  registerWorker(keys().III_URL, { workerName: "next-server" });

if (process.env.NODE_ENV !== "production") {
  globalForIII.iii = iii;
}

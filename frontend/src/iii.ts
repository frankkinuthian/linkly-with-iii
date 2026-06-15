import { registerWorker } from "iii-browser-sdk";

const TOKEN = import.meta.env.VITE_LINKLY_TOKEN ?? "dev-token";

export const worker = registerWorker(
  `ws://localhost:3110?token=${encodeURIComponent(TOKEN)}`,
);

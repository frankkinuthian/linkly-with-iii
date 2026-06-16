import { registerWorker } from "iii-sdk";
import { Logger } from "@iii-dev/observability";

const worker = registerWorker(process.env.III_URL ?? "ws://localhost:49134", {
  workerName: "auth",
});
const logger = new Logger();

worker.registerFunction(
  "auth::browser",
  async (input: {
    headers: Record<string, string>;
    query_params: Record<string, string[]>;
    ip_address: string;
  }) => {
    const token = input.query_params.token?.[0];
    if (!token || token !== (process.env.LINKLY_BROWSER_TOKEN ?? "dev-token")) {
      throw new Error("unauthorized");
    }
    return {
      allowed_functions: [],
      forbidden_functions: [],
      allow_trigger_type_registration: false,
      allow_function_registration: true,
      context: { source: "browser" },
    };
  },
);

logger.info("Auth Worker Ready!");

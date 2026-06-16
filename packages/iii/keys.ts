import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      III_URL: z.string().url(),
    },
    runtimeEnv: {
      III_URL: process.env.III_URL,
    },
  });

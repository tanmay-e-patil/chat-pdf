import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const envClient = createEnv({
  clientPrefix: "NEXT_PUBLIC",
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().min(1),
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().min(1),
    NEXT_PUBLIC_S3_BUCKET_NAME: z.string().min(1),
  },
  runtimeEnv: process.env,
});

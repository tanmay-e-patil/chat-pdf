import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NEXT_BASE_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url(),
    NEXT_PUBLIC_S3_BUCKET_NAME: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1).optional(),
    AWS_REGION: z.string().min(1),
    S3_BUCKET_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_SESSION_TOKEN: z.string().optional(),
    BEDROCK_EMBEDDING_MODEL_ID: z
      .string()
      .default("amazon.titan-embed-text-v1"),
    BEDROCK_CHAT_MODEL_ID: z.string().default("us.amazon.nova-lite-v1:0"),
    AWS_INGESTION_LAMBDA_NAME: z.string().optional(),
    PINECONE_ENVIRONMENT: z.string().min(1),
    PINECONE_API_KEY: z.string().min(1),
    PINECONE_INDEX_NAME: z.string().default("chat-pdf-aws"),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
});

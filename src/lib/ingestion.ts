import "server-only";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { eq } from "drizzle-orm";
import { awsConfig } from "./aws";
import { db } from "./db";
import { chats } from "./db/schema";
import { env } from "./env/server";
import { loadS3IntoPinecone } from "./pinecone";

type IngestionJob = { chatId: string; fileKey: string };

const lambda = new LambdaClient(awsConfig());

export async function triggerIngestion(job: IngestionJob) {
  if (!env.AWS_INGESTION_LAMBDA_NAME) {
    if (process.env.NODE_ENV === "development") {
      // ponytail: local fallback only; production must use Lambda so PDF bytes stay in AWS.
      void processPdfIngestion(job);
      return;
    }
    throw new Error("AWS_INGESTION_LAMBDA_NAME is required");
  }

  await lambda.send(
    new InvokeCommand({
      FunctionName: env.AWS_INGESTION_LAMBDA_NAME,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(job)),
    }),
  );
}

export async function processPdfIngestion({ chatId, fileKey }: IngestionJob) {
  try {
    await db
      .update(chats)
      .set({ ingestionStatus: "processing", ingestionError: null })
      .where(eq(chats.id, chatId));

    await loadS3IntoPinecone(fileKey);

    await db
      .update(chats)
      .set({ ingestionStatus: "ready", ingestionError: null })
      .where(eq(chats.id, chatId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(chats)
      .set({ ingestionStatus: "failed", ingestionError: message })
      .where(eq(chats.id, chatId));
    throw error;
  }
}

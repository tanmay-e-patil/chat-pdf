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

export function processPdfIngestion({ chatId, fileKey }: IngestionJob) {
  return updateChatIngestion(chatId, "processing", null)
    .then(() => loadS3IntoPinecone(fileKey))
    .then(() => updateChatIngestion(chatId, "ready", null))
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      return updateChatIngestion(chatId, "failed", message).then(() => {
        throw error;
      });
    });
}

function updateChatIngestion(
  chatId: string,
  ingestionStatus: "processing" | "ready" | "failed",
  ingestionError: string | null,
) {
  return db
    .update(chats)
    .set({ ingestionStatus, ingestionError })
    .where(eq(chats.id, chatId));
}

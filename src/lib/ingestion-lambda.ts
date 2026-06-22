import { processPdfIngestion } from "./ingestion";

export async function handler(event: { chatId: string; fileKey: string }) {
  await processPdfIngestion(event);
  return { ok: true };
}

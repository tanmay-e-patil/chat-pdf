import "../lambda-server-only";
import { z } from "zod";
import { runIndexJob } from "./internal/lifecycle";

const jobSchema = z.object({
  chatId: z.string().uuid(),
  fileKey: z.string().min(1),
  attempt: z.string().datetime(),
});

// Legacy events without `attempt` are dropped; their chats read as queued and are re-dispatched on next view.
export async function handler(event: unknown) {
  const job = jobSchema.safeParse(event);
  if (!job.success) {
    console.error("invalid index job", event);
    return { ok: false };
  }
  await runIndexJob(job.data);
  return { ok: true };
}

import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import {
  citationsSchema,
  type ChatUIMessage,
  type Citation,
} from "@/lib/document-index/shared";

export async function loadConversation(
  chatId: string,
  userId: string,
): Promise<ChatUIMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
    .orderBy(asc(messages.createdAt));
  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: [{ type: "text", text: row.content }],
    metadata:
      row.role === "assistant"
        ? { citations: parseCitations(row.citations) }
        : undefined,
  }));
}

export async function appendUserMessage(
  chatId: string,
  userId: string,
  text: string,
): Promise<void> {
  await db
    .insert(messages)
    .values({ chatId, userId, role: "user", content: text });
}

export async function appendAssistantMessage(
  chatId: string,
  userId: string,
  text: string,
  citations: Citation[],
): Promise<void> {
  await db
    .insert(messages)
    .values({ chatId, userId, role: "assistant", content: text, citations });
}

export async function clearConversation(
  chatId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)));
}

function parseCitations(raw: unknown): Citation[] {
  const parsed = citationsSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

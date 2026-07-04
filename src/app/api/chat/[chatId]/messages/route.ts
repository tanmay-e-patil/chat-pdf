import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const _messages = await db
    .select()
    .from(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
    .execute();
  return NextResponse.json(_messages, { status: 200 });
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await getOwnedChat(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await db
    .delete(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
    .execute();
  return NextResponse.json({ ok: true }, { status: 200 });
};

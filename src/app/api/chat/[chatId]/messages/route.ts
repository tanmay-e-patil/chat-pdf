import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const { chatId } = await params;
  const _messages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .execute();
  return NextResponse.json(_messages, { status: 200 });
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await db.delete(messages).where(eq(messages.chatId, chatId)).execute();
  return NextResponse.json({ ok: true }, { status: 200 });
};

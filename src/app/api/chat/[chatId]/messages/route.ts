import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const GET = async (req: Request, context) => {
  const { params } = context;
  const chatId = await params.chatId;
  const _messages = await db
    .select()
    .from(messages)
    .where(eq(chatId, messages.chatId))
    .execute();
  console.log(_messages);
  return NextResponse.json(_messages, { status: 200 });
};

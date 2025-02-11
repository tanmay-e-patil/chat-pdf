import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  console.log(_messages);
  return NextResponse.json(_messages, { status: 200 });
};

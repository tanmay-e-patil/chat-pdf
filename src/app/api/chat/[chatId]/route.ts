import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { deleteFromPinecone } from "@/lib/pinecone";
import { deleteFromS3 } from "@/lib/s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const DELETE = async (
  req: Request,
  context: { params: { chatId: string } },
) => {
  const { chatId } = await context.params;
  await db.delete(messages).where(eq(messages.chatId, chatId)).execute();
  const deletedChats = await db
    .delete(chats)
    .where(eq(chats.id, chatId))
    .returning({
      fileKey: chats.fileKey,
    });

  if (deletedChats.length === 0) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  const file_key = deletedChats[0].fileKey;
  console.log(file_key);
  await deleteFromPinecone(file_key);
  await deleteFromS3(file_key);

  return NextResponse.json(file_key, { status: 200 });
};

import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { loadS3IntoPinecone } from "@/lib/pinecone";
import { getS3Url } from "@/lib/s3";
import { checkSubscription } from "@/lib/subscriptions";
import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const userId = await (await auth()).userId;
  const isPro = await checkSubscription();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPro) {
    const numChats = await db
      .select({
        count: count(),
      })
      .from(chats)
      .where(eq(chats.userId, userId))
      .execute();
    if (numChats[0].count >= 1) {
      return NextResponse.json(
        { error: "You need a Pro subscription to create more chats" },
        { status: 403 },
      );
    }
  }
  try {
    const body = await req.json();
    const { file_key, file_name }: { file_key: string; file_name: string } =
      body;
    await loadS3IntoPinecone(file_key);
    const chatId = await db
      .insert(chats)
      .values({
        fileKey: file_key,
        pdfName: file_name,
        pdfUrl: getS3Url(file_key),
        userId: userId,
      })
      .returning({
        insertedId: chats.id,
      });
    return NextResponse.json(
      { chat_id: chatId[0].insertedId },
      { status: 200 },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal Server Error" + e },
      { status: 500 },
    );
  }
}

import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { triggerIngestion } from "@/lib/ingestion";
import { getS3Url } from "@/lib/s3";
import { checkSubscription } from "@/lib/subscriptions";
import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const createChatSchema = z.object({
  file_key: z.string().min(1),
  file_name: z.string().min(1),
});

export async function POST(req: Request) {
  const userId = await (await auth()).userId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isPro = await checkSubscription(userId);

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
    const parsed = createChatSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { file_key, file_name } = parsed.data;
    if (!file_key.startsWith(`uploads/${userId}/`)) {
      return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
    }

    const chatId = await db
      .insert(chats)
      .values({
        fileKey: file_key,
        pdfName: file_name,
        pdfUrl: getS3Url(file_key),
        userId: userId,
        ingestionStatus: "processing",
      })
      .returning({
        insertedId: chats.id,
      });

    try {
      await triggerIngestion({
        chatId: chatId[0].insertedId,
        fileKey: file_key,
      });
    } catch (error) {
      await db
        .update(chats)
        .set({
          ingestionStatus: "failed",
          ingestionError:
            error instanceof Error ? error.message : String(error),
        })
        .where(eq(chats.id, chatId[0].insertedId));
      throw error;
    }

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

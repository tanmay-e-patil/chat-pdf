import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { ensureIndexed } from "@/lib/document-index";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chat = await getOwnedChat((await params).chatId, userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ indexState: await ensureIndexed(chat, "retry") });
}

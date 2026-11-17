import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { clearConversation, loadConversation } from "@/lib/chat-messages";
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

  return NextResponse.json(await loadConversation(chatId, userId), {
    status: 200,
  });
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

  await clearConversation(chatId, userId);
  return NextResponse.json({ ok: true }, { status: 200 });
};

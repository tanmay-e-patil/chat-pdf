import ChatWorkspace from "@/components/ChatWorkspace";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ chatId: string }>;
};

const ChatPage = async (props: Props) => {
  const chatId = (await props.params).chatId;
  const { userId } = await auth();
  if (!userId) {
    return redirect("/sign-in");
  }
  const _chats = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .execute();
  if (!_chats) {
    return redirect("/");
  }
  const currentChat = _chats.find((chat) => chat.id === chatId);

  if (!currentChat) {
    return redirect("/");
  }
  const initialMessages = (
    await db
      .select()
      .from(messages)
      .where(and(eq(messages.chatId, chatId), eq(messages.userId, userId)))
      .orderBy(asc(messages.createdAt))
      .execute()
  ).map(toUIMessage);

  return (
    <main className="h-screen overflow-hidden bg-[#070A12] p-3 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(74,222,128,.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(96,165,250,.14),transparent_30%)]" />
      <ChatWorkspace
        chats={_chats}
        chatId={chatId}
        currentChat={currentChat}
        initialMessages={initialMessages}
      />
    </main>
  );
};

export default ChatPage;

function toUIMessage(message: {
  id: string;
  role: "user" | "assistant";
  content: string;
}): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

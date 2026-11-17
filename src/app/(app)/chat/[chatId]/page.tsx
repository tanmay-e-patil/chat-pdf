import ChatWorkspace from "@/components/ChatWorkspace";
import { loadConversation } from "@/lib/chat-messages";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { ensureIndexed, indexStateOf } from "@/lib/document-index";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
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
  const userChats = await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .execute();
  const currentChat = userChats.find((chat) => chat.id === chatId);
  if (!currentChat) {
    return redirect("/");
  }

  // Self-heals chats whose indexing never started, and rebuilds legacy indexes built before citations.
  const [indexState, initialMessages] = await Promise.all([
    ensureIndexed(currentChat, "view"),
    loadConversation(chatId, userId),
  ]);

  return (
    <main className="h-screen overflow-hidden bg-[#070A12] p-3 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(74,222,128,.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(96,165,250,.14),transparent_30%)]" />
      <ChatWorkspace
        chats={userChats.map((chat) => ({
          id: chat.id,
          pdfName: chat.pdfName,
          indexState: chat.id === chatId ? indexState : indexStateOf(chat),
        }))}
        chatId={chatId}
        fileKey={currentChat.fileKey}
        initialIndexState={indexState}
        initialMessages={initialMessages}
      />
    </main>
  );
};

export default ChatPage;

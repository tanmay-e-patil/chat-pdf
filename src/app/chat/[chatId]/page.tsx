import ChatComponent from "@/components/ChatComponent";
import ChatSideBar from "@/components/ChatSideBar";
import PDFViewer from "@/components/PDFViewer";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import React from "react";

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

  return (
    <div className="flex overflow-scroll scrollbar-hidden">
      <div className="flex w-full  overflow-scroll scrollbar-hidden">
        <div className="flex-[1] max-w-xs">
          <ChatSideBar chats={_chats} chatId={chatId} />
        </div>
        <div className=" overflow-scroll scrollbar-hidden flex-[5]">
          <PDFViewer file_key={currentChat.fileKey} />
        </div>
        <div className="flex-[3] border-l-slate-200 h-screen flex flex-col">
          <ChatComponent chatId={chatId} userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

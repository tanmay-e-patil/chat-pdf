"use client";

import ChatComponent from "@/components/ChatComponent";
import ChatSideBar, { type SidebarChat } from "@/components/ChatSideBar";
import PDFViewer from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import type { ChatUIMessage, IndexState } from "@/lib/document-index/shared";
import { PanelLeftOpen } from "lucide-react";
import { useState } from "react";

type Props = {
  chats: SidebarChat[];
  chatId: string;
  fileKey: string;
  initialIndexState: IndexState;
  initialMessages: ChatUIMessage[];
};

// `seq` changes on every click so citing the same page twice still jumps.
export type PageJump = { page: number; seq: number };

export default function ChatWorkspace({
  chats,
  chatId,
  fileKey,
  initialIndexState,
  initialMessages,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [jump, setJump] = useState<PageJump | null>(null);
  const onCitePage = (page: number) =>
    setJump((previous) => ({ page, seq: (previous?.seq ?? 0) + 1 }));

  return (
    <div
      className={
        sidebarOpen
          ? "relative grid h-full gap-3 lg:grid-cols-[18rem_minmax(0,1fr)_26rem]"
          : "relative grid h-full gap-3 lg:grid-cols-[minmax(0,1fr)_26rem]"
      }
    >
      {sidebarOpen ? (
        <ChatSideBar
          chats={chats}
          chatId={chatId}
          onCollapse={() => setSidebarOpen(false)}
        />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-3 top-3 z-20 size-10 rounded-full border border-white/10 bg-slate-950/80 text-slate-200 backdrop-blur hover:bg-white/10 hover:text-white"
          onClick={() => setSidebarOpen(true)}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </Button>
      )}
      <section className="w-full justify-self-center overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl shadow-black/40">
        <PDFViewer fileKey={fileKey} jump={jump} />
      </section>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.04] shadow-2xl shadow-black/40 backdrop-blur-xl">
        <ChatComponent
          chatId={chatId}
          initialIndexState={initialIndexState}
          initialMessages={initialMessages}
          onCitePage={onCitePage}
        />
      </section>
    </div>
  );
}

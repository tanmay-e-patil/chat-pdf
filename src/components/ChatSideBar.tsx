"use client";
import type { DrizzleChat } from "@/lib/db/schema";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import {
  FileText,
  MessageCircle,
  PanelLeftClose,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

type Props = {
  chats: DrizzleChat[];
  chatId: string;
  onCollapse: () => void;
};

const ChatSideBar = ({ chats, chatId, onCollapse }: Props) => {
  const router = useRouter();
  const { mutate } = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await fetch(`/api/chat/${id}`, {
        method: "DELETE",
      });

      const resJson = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Error removing chat: " + resJson.error);
        } else {
          toast.error("Error removing chat");
        }
        return;
      }
      if (id === chatId) router.push("/");
      router.refresh();
      return resJson;
    },
  });

  return (
    <aside className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[.04] p-4 text-slate-200 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 font-semibold text-white"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-slate-950 shadow-[0_0_40px_rgba(52,211,153,.35)]">
            <FileText className="size-5" />
          </span>
          <span>ChatPDF</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>
      <Button
        asChild
        className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
        title="New PDF"
      >
        <Link href="/upload">
          <PlusCircle className="mr-2 size-4" />
          New PDF
        </Link>
      </Button>
      <div className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto scrollbar-hidden">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`} title={chat.pdfName}>
            <div
              className={cn(
                "flex items-center rounded-2xl p-3 text-slate-300 transition",
                {
                  "bg-emerald-400 text-slate-950": chat.id === chatId,
                  "hover:bg-white/10 hover:text-white": chat.id !== chatId,
                },
              )}
            >
              <MessageCircle className="mr-2 size-5 shrink-0" />
              <p className="w-full overflow-hidden truncate whitespace-nowrap text-sm text-ellipsis">
                {chat.pdfName}
                {chat.ingestionStatus !== "ready" &&
                  ` (${chat.ingestionStatus})`}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 size-8 shrink-0 rounded-full text-inherit hover:bg-red-500/20 hover:text-red-200"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  mutate({ id: chat.id });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4 flex min-h-12 items-center justify-center border-t border-white/10 pt-4 text-white">
        <UserButton
          afterSignOutUrl="/"
          showName
          appearance={{
            elements: {
              userButtonOuterIdentifier: "text-slate-200",
              userButtonBox: "text-slate-200",
            },
          }}
        />
      </div>
    </aside>
  );
};

export default ChatSideBar;

"use client";
import { DrizzleChat } from "@/lib/db/schema";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { MessageCircle, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type Props = {
  chats: DrizzleChat[];
  chatId: string;
};

const ChatSideBar = ({ chats, chatId }: Props) => {
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
      // Refresh the page on success
      router.refresh();
      return resJson;
    },
  });

  return (
    <div className="w-full h-screen p-4 text-gray-200 bg-gray-900">
      <Link href="/">
        <Button className="w-full border-dashed border-white border">
          <PlusCircle className="mr-2 w-4 h-4"></PlusCircle>
          New PDF
        </Button>
      </Link>
      <div className="flex flex-col gap-2 mt-4">
        {chats.map((chat) => (
          <Link key={chat.id} href={`/chat/${chat.id}`}>
            <div
              className={cn(`rounded-lg p-3 text-slate-300 flex items-center`, {
                "bg-blue-600 text-white": chat.id === chatId,
                "hover:text-white": chat.id !== chatId,
              })}
            >
              <MessageCircle className="mr-2"></MessageCircle>
              <p className="w-full overflow-hidden text-sm truncate whitespace-nowrap text-ellipsis">
                {chat.pdfName}
              </p>
              <Button
                className="px-2 bg-red-500"
                onClick={() => {
                  mutate({ id: chat.id });
                }}
              >
                <Trash2 className="size-5 "></Trash2>
              </Button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ChatSideBar;

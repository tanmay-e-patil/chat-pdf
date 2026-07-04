"use client";
import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { RotateCcw, Send } from "lucide-react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import MessageList from "./MessageList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  chatId: string;
  ingestionStatus: "processing" | "ready" | "failed";
};

const ChatComponent = ({ chatId, ingestionStatus }: Props) => {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      const json = await response.json();
      return json.map(toUIMessage);
    },
  });

  const { data: chat } = useQuery({
    queryKey: ["chat-status", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatId}`);
      if (!response.ok) throw new Error("Failed to load chat status");
      return (await response.json()) as {
        ingestionStatus: Props["ingestionStatus"];
      };
    },
    initialData: { ingestionStatus },
    refetchInterval: (query) =>
      query.state.data?.ingestionStatus === "ready" ? false : 2000,
  });
  const currentStatus = chat.ingestionStatus;

  const { messages, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai",
      body: { chatId },
    }),
  });

  const { mutate: clearMessages, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear messages");
    },
    onSuccess: async () => {
      setMessages([]);
      await queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    },
  });

  useEffect(() => {
    if (data) setMessages(data);
  }, [data, setMessages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || currentStatus !== "ready") return;
    sendMessage({ parts: [{ type: "text", text }] });
    setInput("");
  };
  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    messageContainer?.scrollTo({
      top: messageContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-white">
            Chat
          </h3>
          {currentStatus !== "ready" && (
            <p className="mt-1 text-sm text-slate-300">
              {currentStatus === "processing"
                ? "Processing PDF..."
                : "PDF processing failed."}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
          onClick={() => clearMessages()}
          disabled={isClearing || messages.length === 0}
          aria-label="Clear messages"
          title="Clear messages"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div
        className="flex-1 overflow-y-auto px-2 py-4 scrollbar-hidden"
        id="message-container"
      >
        <MessageList messages={messages} isLoading={isPending} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              currentStatus === "ready"
                ? "Ask a follow-up…"
                : "PDF not ready yet"
            }
            className="h-11 border-0 text-white shadow-none placeholder:text-slate-400 focus-visible:ring-0"
            disabled={currentStatus !== "ready"}
          />
          <Button
            className="size-11 rounded-full bg-emerald-400 p-0 text-slate-950 hover:bg-emerald-300"
            disabled={currentStatus !== "ready"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;

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

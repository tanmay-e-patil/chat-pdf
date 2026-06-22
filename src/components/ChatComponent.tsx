"use client";
import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";

type Props = {
  chatId: string;
  userId: string;
  ingestionStatus: "processing" | "ready" | "failed";
};

const ChatComponent = ({ chatId, userId, ingestionStatus }: Props) => {
  const [input, setInput] = useState("");
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
      body: { chatId, userId },
    }),
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
    <div className="relative h-screen flex flex-col bg-gray-900">
      <div className="sticky top-0 inset-x-0 p-2 bg-gray-800 h-fit ">
        <h3 className="text-xl font-bold text-white">Chat</h3>
        {currentStatus !== "ready" && (
          <p className="text-sm text-gray-300">
            {currentStatus === "processing"
              ? "Processing PDF..."
              : "PDF processing failed."}
          </p>
        )}
      </div>
      <div
        className="flex-1 overflow-y-auto scrollbar-hidden px-2"
        id="message-container"
      >
        <MessageList messages={messages} isLoading={isPending} />
      </div>
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-2 py-4 bg-gray-800"
      >
        <div className="flex flex-row justify-between">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              currentStatus === "ready"
                ? "Ask any question..."
                : "PDF not ready yet"
            }
            className="w-full text-white"
            disabled={currentStatus !== "ready"}
          />
          <Button variant="secondary" disabled={currentStatus !== "ready"}>
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

"use client";
import React, { useEffect } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";

import { useChat } from "@ai-sdk/react";
import MessageList from "./MessageList";
import { useQuery } from "@tanstack/react-query";

type Props = {
  chatId: string;
  userId: string;
};

const ChatComponent = ({ chatId, userId }: Props) => {
  const { data, isPending } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      const json = await response.json();
      return json;
    },
  });

  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/ai",
    body: {
      chatId,
      userId,
    },
    initialMessages: data || [],
  });
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
            onChange={handleInputChange}
            placeholder="Ask any question..."
            className="w-full text-white"
          />
          <Button variant="secondary">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;

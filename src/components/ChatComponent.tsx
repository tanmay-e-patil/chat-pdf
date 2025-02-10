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
    <div
      className="relative max-h-screen overflow-scroll"
      id="message-container"
    >
      <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>
      <MessageList messages={messages} isLoading={isPending} />
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 inset-x-0 px-2 py-4 bg-white"
      >
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask any question..."
          className="w-full"
        />
        <Button>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatComponent;

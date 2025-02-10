"use client";
import React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send } from "lucide-react";

import { useChat } from "@ai-sdk/react";
import MessageList from "./MessageList";

// type Props = {}

const ChatComponent = () => {
  const { input, handleInputChange, handleSubmit, messages } = useChat({
    api: "/api/ai",
  });
  return (
    <div className="relative max-h-screen overflow-scroll">
      <div className="sticky top-0 inset-x-0 p-2 bg-white h-fit">
        <h3 className="text-xl font-bold">Chat</h3>
      </div>
      <MessageList messages={messages} />
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

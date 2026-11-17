"use client";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { RotateCcw, Send } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import MessageList from "./MessageList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  QUICK_ACTIONS,
  describeIndexState,
  messageText,
  type ChatUIMessage,
  type Citation,
  type IndexState,
} from "@/lib/document-index/shared";

type Props = {
  chatId: string;
  initialIndexState: IndexState;
  initialMessages: ChatUIMessage[];
  onCite: (citation: Citation) => void;
};

const ChatComponent = ({
  chatId,
  initialIndexState,
  initialMessages,
  onCite,
}: Props) => {
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();
  const indexStateKey = ["index-state", chatId];

  const { data: indexState } = useQuery({
    queryKey: indexStateKey,
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatId}`);
      if (!response.ok) throw new Error("Failed to load index state");
      return ((await response.json()) as { indexState: IndexState }).indexState;
    },
    initialData: initialIndexState,
    refetchInterval: (query) =>
      query.state.data && describeIndexState(query.state.data).poll
        ? 2000
        : false,
  });
  const view = describeIndexState(indexState);

  const { mutate: retry, isPending: isRetrying } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/index`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Retry failed");
      return ((await response.json()) as { indexState: IndexState }).indexState;
    },
    onSuccess: (next) => queryClient.setQueryData(indexStateKey, next),
    onError: () => toast.error("Couldn't restart indexing. Try again."),
  });

  const { messages, sendMessage, setMessages, status } = useChat<ChatUIMessage>(
    {
      id: chatId,
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: "/api/ai",
        // The server loads history itself; send only the new question.
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { chatId, text: messageText(messages[messages.length - 1]) },
        }),
      }),
      onError: () => {
        toast.error("The assistant couldn't answer. Try again.");
        void queryClient.invalidateQueries({ queryKey: indexStateKey });
      },
    },
  );
  const isBusy = status === "submitted" || status === "streaming";

  const { mutate: clearMessages, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear messages");
    },
    onSuccess: () => setMessages([]),
  });

  const ask = (text: string) => {
    if (!text || !view.canAsk || isBusy) return;
    sendMessage({ text });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input.trim());
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
          {!view.canAsk && (
            <div className="mt-1 text-sm">
              <p className="text-slate-200">{view.headline}</p>
              {view.detail && (
                <p className="mt-1 text-slate-400">{view.detail}</p>
              )}
              {view.canRetry && (
                <Button
                  size="sm"
                  className="mt-3 rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={() => retry()}
                  disabled={isRetrying}
                >
                  Try again
                </Button>
              )}
            </div>
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
        <MessageList
          messages={messages}
          streaming={status === "streaming"}
          onCite={onCite}
        />
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/10 bg-white/[.04] text-slate-200 hover:bg-white/10 hover:text-white"
              disabled={!view.canAsk || isBusy}
              onClick={() => ask(action.prompt)}
            >
              {action.label}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={view.canAsk ? "Ask a follow-up…" : view.headline}
              className="h-11 border-0 text-white shadow-none placeholder:text-slate-400 focus-visible:ring-0"
              disabled={!view.canAsk}
            />
            <Button
              className="size-11 rounded-full bg-emerald-400 p-0 text-slate-950 hover:bg-emerald-300"
              disabled={!view.canAsk || isBusy}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatComponent;

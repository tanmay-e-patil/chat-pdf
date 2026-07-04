import React from "react";
import { type UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Props = {
  messages: UIMessage[];
  isLoading: boolean;
};

const MessageList = ({ messages, isLoading }: Props) => {
  if (isLoading)
    return (
      <div className="grid h-full place-items-center text-emerald-300">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  if (!messages) return <></>;
  return (
    <div className="flex h-full flex-col gap-3 px-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn("flex", {
            "justify-end pl-10": message.role === "user",
            "justify-start pr-10": message.role === "assistant",
          })}
        >
          <div
            className={cn(
              "rounded-3xl px-4 py-3 text-sm leading-6 shadow-md",
              {
                "bg-emerald-400 font-medium text-slate-950":
                  message.role === "user",
                "border border-white/10 bg-slate-900 text-slate-200":
                  message.role === "assistant",
              },
            )}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mb-2 overflow-x-auto rounded-2xl bg-black/30 p-3 text-xs last:mb-0">
                    {children}
                  </pre>
                ),
              }}
            >
              {getMessageText(message)}
            </ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;

function getMessageText(message: UIMessage) {
  const textParts: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text") textParts.push(part.text);
  }
  return textParts.join("\n");
}

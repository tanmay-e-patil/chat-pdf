import React from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown, { type Components } from "react-markdown";
import {
  citedPageFromHref,
  linkifyCitations,
  messageText,
  type ChatUIMessage,
  type Citation,
} from "@/lib/document-index/shared";

type Props = {
  messages: ChatUIMessage[];
  streaming: boolean;
  onCitePage: (page: number) => void;
};

const baseComponents: Components = {
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
};

const MessageList = ({ messages, streaming, onCitePage }: Props) => {
  return (
    <div className="flex h-full flex-col gap-3 px-3">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const pending = streaming && index === messages.length - 1;
        const citations = message.metadata?.citations ?? [];
        const text = messageText(message);
        return (
          <div
            key={message.id}
            className={cn("flex", {
              "justify-end pl-10": isUser,
              "justify-start pr-10": !isUser,
            })}
          >
            <div
              className={cn(
                "rounded-3xl px-4 py-3 text-sm leading-6 shadow-md",
                {
                  "bg-emerald-400 font-medium text-slate-950": isUser,
                  "border border-white/10 bg-slate-900 text-slate-200": !isUser,
                },
              )}
            >
              {isUser ? (
                <ReactMarkdown components={baseComponents}>
                  {text}
                </ReactMarkdown>
              ) : (
                <ReactMarkdown
                  components={{
                    ...baseComponents,
                    a: ({ href, children }) => {
                      const page = citedPageFromHref(href);
                      if (page === null) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {children}
                          </a>
                        );
                      }
                      return (
                        <CitationChip
                          page={page}
                          citation={citations.find((c) => c.page === page)}
                          pending={pending}
                          onCitePage={onCitePage}
                        />
                      );
                    },
                  }}
                >
                  {linkifyCitations(text)}
                </ReactMarkdown>
              )}
              {!isUser && citations.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2 text-xs text-slate-400">
                  Sources:
                  {citations.map((citation) => (
                    <CitationChip
                      key={citation.page}
                      page={citation.page}
                      citation={citation}
                      pending={false}
                      onCitePage={onCitePage}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;

function CitationChip({
  page,
  citation,
  pending,
  onCitePage,
}: {
  page: number;
  citation: Citation | undefined;
  pending: boolean;
  onCitePage: (page: number) => void;
}) {
  if (pending) {
    return (
      <span className="mx-0.5 inline-flex rounded-full bg-white/10 px-2 text-xs text-slate-400">
        p. {page}
      </span>
    );
  }
  // The model cited a page it was never shown; don't present it as a source.
  if (!citation) return <span>[p. {page}]</span>;
  return (
    <button
      type="button"
      title={citation.excerpt}
      onClick={() => onCitePage(page)}
      className="mx-0.5 inline-flex rounded-full bg-emerald-300/15 px-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/30"
    >
      p. {page}
    </button>
  );
}

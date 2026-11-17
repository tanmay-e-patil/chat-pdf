import { z } from "zod";
import type { UIMessage } from "ai";

export const INDEX_FAILURES = {
  no_text_layer: {
    retryable: false,
    title: "This PDF has no selectable text",
    detail:
      "It looks scanned or image-only. OCR isn't supported yet, so export a text-based PDF (or run OCR) and upload it again.",
  },
  unreadable_pdf: {
    retryable: false,
    title: "We couldn't read this PDF",
    detail:
      "The file is damaged or password-protected. Re-save it without a password and upload it again.",
  },
  file_missing: {
    retryable: true,
    title: "We couldn't fetch the uploaded file",
    detail: "The upload may not have finished. Try again.",
  },
  embedding_failed: {
    retryable: true,
    title: "Indexing was interrupted",
    detail: "Our AI provider didn't respond. Try again in a minute.",
  },
  timed_out: {
    retryable: true,
    title: "Indexing took too long",
    detail: "Try again. Very large PDFs may need to be split.",
  },
  dispatch_failed: {
    retryable: true,
    title: "Indexing didn't start",
    detail: "Try again.",
  },
  unknown: {
    retryable: true,
    title: "Indexing failed",
    detail: "Something went wrong on our side. Try again.",
  },
} as const satisfies Record<
  string,
  { retryable: boolean; title: string; detail: string }
>;

export type IndexFailureCode = keyof typeof INDEX_FAILURES;

export type IndexState =
  | { status: "queued" }
  | { status: "indexing"; since: string }
  | { status: "ready" }
  | { status: "stale" }
  | { status: "failed"; reason: IndexFailureCode; retryable: boolean };

export type IndexStateView = {
  headline: string;
  detail?: string;
  canAsk: boolean;
  canRetry: boolean;
  poll: boolean;
};

export function describeIndexState(state: IndexState): IndexStateView {
  switch (state.status) {
    case "ready":
      return { headline: "Ready", canAsk: true, canRetry: false, poll: false };
    case "queued":
      return {
        headline: "Starting indexing…",
        canAsk: false,
        canRetry: false,
        poll: true,
      };
    case "indexing":
      return {
        headline: "Indexing your PDF…",
        detail:
          "Reading each page and building citations. This usually takes under a minute.",
        canAsk: false,
        canRetry: false,
        poll: true,
      };
    case "stale":
      return {
        headline: "Upgrading this PDF's index…",
        detail: "We're re-reading it to add page citations.",
        canAsk: false,
        canRetry: false,
        poll: true,
      };
    case "failed": {
      const failure = INDEX_FAILURES[state.reason];
      return {
        headline: failure.title,
        detail: failure.detail,
        canAsk: false,
        canRetry: failure.retryable,
        poll: false,
      };
    }
  }
}

export const citationSchema = z.object({
  page: z.number().int().positive(),
  excerpt: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;
export const citationsSchema = z.array(citationSchema);

export type ChatMessageMetadata = { citations?: Citation[] };
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

const CITATION_MARKER = /\[(?:p\.?|page)\s*(\d{1,4})\]/gi;
const CODE_FENCE = /(```[\s\S]*?```)/g;
const CITE_HREF = /^#cite-(\d+)$/;

export function formatCitationMarker(page: number): string {
  return `[p. ${page}]`;
}

export function extractCitedPages(text: string): number[] {
  const pages = new Set<number>();
  for (const match of text.matchAll(CITATION_MARKER)) {
    pages.add(Number(match[1]));
  }
  return [...pages];
}

export function linkifyCitations(markdown: string): string {
  return markdown
    .split(CODE_FENCE)
    .map((segment) =>
      segment.startsWith("```")
        ? segment
        : segment.replace(
            CITATION_MARKER,
            (_, page) => `[p. ${page}](#cite-${page})`,
          ),
    )
    .join("");
}

export function citedPageFromHref(href: string | undefined): number | null {
  const match = href?.match(CITE_HREF);
  return match ? Number(match[1]) : null;
}

export function messageText(message: { parts: UIMessage["parts"] }): string {
  const textParts: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text") textParts.push(part.text);
  }
  return textParts.join("\n");
}

export const QUICK_ACTIONS = [
  {
    label: "Summary",
    prompt:
      "Summarize this document. Cover its purpose, the main points, and any conclusions.",
  },
  {
    label: "Risks",
    prompt:
      "List the risks, caveats, obligations, or open issues this document raises.",
  },
  {
    label: "Actions",
    prompt:
      "Extract the action items, decisions, and deadlines from this document as a list.",
  },
] as const;

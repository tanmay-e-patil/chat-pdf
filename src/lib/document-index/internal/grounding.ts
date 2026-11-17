import "server-only";
import { generateText, type ModelMessage } from "ai";
import { bedrock } from "@/lib/bedrock";
import type { DrizzleChat } from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import {
  citedClaims,
  formatCitationMarker,
  messageText,
  type ChatUIMessage,
  type Citation,
  type IndexState,
} from "../shared";
import { excerptFor, excerptOf } from "./excerpt";
import { indexStateOf } from "./lifecycle";
import {
  fetchPassages,
  listChunkIds,
  queryPassages,
  type Passage,
} from "./store";

// ~300 chunks * ~1000 chars is ~75k tokens, well inside Nova Lite's 300k context.
const FULL_DOCUMENT_MAX_CHUNKS = 300;
const RETRIEVAL_TOP_K = 8;
const MIN_MATCH_SCORE = 0.2;
const HISTORY_MAX_MESSAGES = 12;
const HISTORY_MAX_CHARS = 24_000;
const REWRITE_HISTORY_MESSAGES = 6;

declare const readyBrand: unique symbol;

// Only openIndex can mint one, so grounding a chat that isn't ready doesn't compile.
export type ReadyIndex = {
  readonly [readyBrand]: true;
  readonly fileKey: string;
  readonly pdfName: string;
};

export type Conversation = {
  history: ChatUIMessage[];
  question: string;
};

export type GroundedTurn = {
  system: string;
  messages: ModelMessage[];
  verifyCitations(answer: string): Citation[];
  mode: "full" | "retrieval";
};

type EvidencePage = { page: number; text: string; best: Passage };

export function openIndex(
  chat: DrizzleChat,
): { ready: true; index: ReadyIndex } | { ready: false; state: IndexState } {
  const state = indexStateOf(chat);
  if (state.status !== "ready") return { ready: false, state };
  return {
    ready: true,
    index: { fileKey: chat.fileKey, pdfName: chat.pdfName } as ReadyIndex,
  };
}

export async function prepareGroundedTurn(
  index: ReadyIndex,
  convo: Conversation,
): Promise<GroundedTurn> {
  const history = windowHistory(convo.history);
  const { mode, passages } = await gatherEvidence(
    index,
    history,
    convo.question,
  );
  const pages = groupByPage(passages, mode);

  return {
    mode,
    system: renderSystemPrompt(index.pdfName, mode, pages),
    messages: [
      ...history.map(toModelMessage),
      { role: "user", content: convo.question },
    ],
    verifyCitations: (answer) => verify(answer, pages),
  };
}

async function gatherEvidence(
  index: ReadyIndex,
  history: ChatUIMessage[],
  question: string,
): Promise<{ mode: "full" | "retrieval"; passages: Passage[] }> {
  const { ids, truncated } = await listChunkIds(
    index.fileKey,
    FULL_DOCUMENT_MAX_CHUNKS,
  );
  if (!truncated) {
    return { mode: "full", passages: await fetchPassages(index.fileKey, ids) };
  }
  const query =
    history.length > 0 ? await standaloneQuery(history, question) : question;
  const hits = await queryPassages(index.fileKey, query, RETRIEVAL_TOP_K);
  return {
    mode: "retrieval",
    passages: hits.filter((hit) => (hit.score ?? 0) >= MIN_MATCH_SCORE),
  };
}

// "What about the second one?" becomes a query that retrieval can actually match.
async function standaloneQuery(
  history: ChatUIMessage[],
  question: string,
): Promise<string> {
  const transcript = history
    .slice(-REWRITE_HISTORY_MESSAGES)
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${messageText(message)}`,
    )
    .join("\n");
  try {
    const { text } = await generateText({
      model: bedrock(env.BEDROCK_CHAT_MODEL_ID),
      temperature: 0,
      maxOutputTokens: 80,
      system:
        "Rewrite the user's latest message as a standalone search query about the document, resolving references to the conversation. Output only the query.",
      prompt: `${transcript}\n\nLatest: ${question}`,
    });
    return text.trim() || question;
  } catch (error) {
    console.error("query rewrite failed", error);
    const lastUser = history.findLast((message) => message.role === "user");
    return lastUser ? `${messageText(lastUser)} ${question}` : question;
  }
}

function groupByPage(
  passages: Passage[],
  mode: "full" | "retrieval",
): EvidencePage[] {
  const byPage = new Map<number, Passage[]>();
  for (const passage of passages) {
    const list = byPage.get(passage.page) ?? [];
    list.push(passage);
    byPage.set(passage.page, list);
  }
  return [...byPage.entries()]
    .sort(([a], [b]) => a - b)
    .map(([page, list]) => {
      list.sort((a, b) => a.start - b.start);
      const best =
        mode === "full"
          ? list[0]
          : list.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));
      return { page, text: joinPassages(list), best };
    });
}

// Chunks overlap; append only the part of each chunk past what's already joined.
function joinPassages(sorted: Passage[]): string {
  let text = "";
  let joinedEnd = -1;
  for (const passage of sorted) {
    if (joinedEnd < 0) {
      text = passage.text;
    } else if (passage.start <= joinedEnd) {
      text += passage.text.slice(Math.max(0, joinedEnd - passage.start));
    } else {
      text += `\n…\n${passage.text}`;
    }
    joinedEnd = Math.max(joinedEnd, passage.end);
  }
  return text;
}

function renderSystemPrompt(
  pdfName: string,
  mode: "full" | "retrieval",
  pages: EvidencePage[],
): string {
  const scope =
    mode === "full"
      ? "The complete document text follows, split into pages."
      : "Below are the passages most relevant to the latest question, grouped by page. You are NOT seeing the whole document. If asked to summarize or list everything, say your answer covers the most relevant sections only.";
  const document = pages
    .map((page) => `<page number="${page.page}">\n${page.text}\n</page>`)
    .join("\n");
  return `You answer questions about the PDF "${pdfName}" using only the document text below.
${scope}

Rules:
- Cite the page for every factual claim, immediately after the claim, written exactly as ${formatCitationMarker(12)} (one page per bracket). Only cite pages that appear below.
- If the text below does not contain the answer, say you couldn't find it in this document. Do not invent information.
- Earlier assistant turns may cite pages that are not shown below. Don't re-cite those unless they appear below.
- Be clear and concise. Format answers as Markdown.

<document>
${document}
</document>`;
}

function windowHistory(history: ChatUIMessage[]): ChatUIMessage[] {
  const recent = history.slice(-HISTORY_MAX_MESSAGES);
  let total = recent.reduce(
    (sum, message) => sum + messageText(message).length,
    0,
  );
  while (recent.length > 0 && total > HISTORY_MAX_CHARS) {
    total -= messageText(recent.shift()!).length;
  }
  return recent;
}

function toModelMessage(message: ChatUIMessage): ModelMessage {
  return message.role === "assistant"
    ? { role: "assistant", content: messageText(message) }
    : { role: "user", content: messageText(message) };
}

function verify(answer: string, pages: EvidencePage[]): Citation[] {
  const byPage = new Map(pages.map((page) => [page.page, page]));
  return [...citedClaims(answer)].flatMap(([page, claims]) => {
    const evidence = byPage.get(page);
    if (!evidence) return [];
    const excerpt =
      excerptFor(claims, evidence.text) ?? excerptOf(evidence.best.text);
    return [{ page, excerpt }];
  });
}

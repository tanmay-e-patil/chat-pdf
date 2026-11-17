import { streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";
import { bedrock } from "@/lib/bedrock";
import {
  appendAssistantMessage,
  appendUserMessage,
  loadConversation,
} from "@/lib/chat-messages";
import {
  openIndex,
  prepareGroundedTurn,
  type ChatMessageMetadata,
  type ChatUIMessage,
} from "@/lib/document-index";
import { env } from "@/lib/env/server";

const bodySchema = z.object({
  chatId: z.string().uuid(),
  text: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { chatId, text: question } = body.data;

  const chat = await getOwnedChat(chatId, userId);
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const opened = openIndex(chat);
  if (!opened.ready) {
    return NextResponse.json({ indexState: opened.state }, { status: 409 });
  }

  // History comes from the database, never from the client.
  const history = await loadConversation(chat.id, userId);
  const turn = await prepareGroundedTurn(opened.index, { history, question });
  await appendUserMessage(chat.id, userId, question);
  console.log("grounded turn", { chatId, mode: turn.mode });

  const result = streamText({
    model: bedrock(env.BEDROCK_CHAT_MODEL_ID),
    system: turn.system,
    messages: turn.messages,
  });

  let answer = "";
  return result.toUIMessageStreamResponse<ChatUIMessage>({
    // Called for every stream part, so the full answer is known by `finish`.
    messageMetadata: ({ part }): ChatMessageMetadata | undefined => {
      if (part.type === "text-delta") answer += part.text;
      if (part.type === "finish") {
        return { citations: turn.verifyCitations(answer) };
      }
      return undefined;
    },
    onFinish: async ({ responseMessage, isAborted }) => {
      if (isAborted || !answer) return;
      await appendAssistantMessage(
        chat.id,
        userId,
        answer,
        responseMessage.metadata?.citations ?? turn.verifyCitations(answer),
      );
    },
    onError: (error) => {
      console.error("chat stream failed", error);
      return "The assistant failed to answer. Please try again.";
    },
  });
}

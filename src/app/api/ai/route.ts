import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { bedrock } from "@/lib/bedrock";
import { env } from "@/lib/env/server";
import { getContext } from "@/lib/context";
import { messages as _messages } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId, getOwnedChat } from "@/lib/authz";

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, chatId } = (await req.json()) as {
    messages: UIMessage[];
    chatId: string;
  };
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const lastMessageContent = getMessageText(lastMessage);
  const chat = await getOwnedChat(chatId, userId);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  if (chat.ingestionStatus !== "ready") {
    return NextResponse.json(
      { error: `PDF is ${chat.ingestionStatus}` },
      { status: 409 },
    );
  }

  const fileKey = chat.fileKey;
  const context = await getContext(lastMessageContent, fileKey);
  console.log("RAG context retrieved", {
    chatId,
    contextLength: context?.length ?? 0,
  });
  const system = `You are a helpful PDF assistant.
You will be provided with a **CONTEXT BLOCK** containing information extracted from an uploaded PDF. Your primary goal is to accurately answer user questions using *only* the information found within this **CONTEXT BLOCK**.

---
**CONTEXT BLOCK**
${context}
---

**Instructions for Answering:**
* **Prioritize the CONTEXT BLOCK:** All answers *must* be directly supported by the provided context. Do not invent information or draw conclusions not explicitly stated in the PDF content.
* **Acknowledge Limitations:** If the answer to a user's question cannot be found within the **CONTEXT BLOCK**, clearly state: "I'm sorry, but I don't know the answer to that question."
* **No Apologies for New Information:** If new information becomes available (e.g., through an updated CONTEXT BLOCK), simply incorporate it into your response without apologizing for prior limitations.
* **Clarity and Conciseness:** Provide clear, direct, and concise answers.
* **Markdown Formatting:** Format responses as Markdown. Use short paragraphs, bullets, numbered lists, and fenced code blocks when helpful.
* **Maintain Persona:** Continue to embody your helpful, knowledgeable, and inspiring persona in all responses.`;

  let isUserMessageInserted = false;

  const results = streamText({
    model: bedrock(env.BEDROCK_CHAT_MODEL_ID),
    system,
    messages: await convertToModelMessages([lastMessage]),
    onChunk: async () => {
      if (!isUserMessageInserted) {
        await db.insert(_messages).values({
          chatId: chatId,
          content: lastMessageContent,
          role: "user",
          userId: userId,
        });
        isUserMessageInserted = true;
      }
    },
    onFinish: async (response) => {
      await db.insert(_messages).values({
        chatId: chatId,
        content: response.text,
        role: "assistant",
        userId: userId,
      });
    },
  });

  return results.toUIMessageStreamResponse();
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

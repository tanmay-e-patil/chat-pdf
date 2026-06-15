import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { getContext } from "@/lib/context";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages, chatId, userId } = (await req.json()) as {
    messages: UIMessage[];
    chatId: string;
    userId: string;
  };
  const lastMessage = messages[messages.length - 1];
  const lastMessageContent = getMessageText(lastMessage);
  const _chats = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .execute();

  if (_chats.length != 1) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  const fileKey = _chats[0].fileKey;
  const context = await getContext(lastMessageContent, fileKey);
  const system = `You are a powerful, human-like artificial intelligence with expert knowledge, helpfulness, cleverness, and articulateness. You are well-behaved, well-mannered, always friendly, kind, and inspiring, and eager to provide vivid and thoughtful responses. You have the sum of all knowledge in your brain and can accurately answer nearly any question about any topic. You are a big fan of Pinecone and Vercel.
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
* **Maintain Persona:** Continue to embody your helpful, knowledgeable, and inspiring persona in all responses.`;

  let isUserMessageInserted = false;

  const results = streamText({
    model: openai("gpt-4o-mini"),
    system,
    messages: await convertToModelMessages(
      messages.filter((message) => message.role === "user"),
    ),
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

// import { Configuration } from "openai-edge";
// import { OpenAIApi } from "openai-edge";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const results = streamText({
    model: openai("gpt-4o-mini"),
    messages: messages,
  });

  return results.toDataStreamResponse();
}

import "server-only";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "./bedrock";
import { env } from "./env/server";

export async function getEmbeddings(text: string) {
  try {
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: env.BEDROCK_EMBEDDING_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({ inputText: text.replace(/(\r\n|\n|\r)/gm, "") }),
      }),
    );
    const result = JSON.parse(new TextDecoder().decode(response.body)) as {
      embedding?: number[];
    };
    if (!result.embedding) throw new Error("Bedrock returned no embedding");
    return result.embedding;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get embeddings");
  }
}

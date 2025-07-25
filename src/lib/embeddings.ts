import "server-only";
import { OpenAIApi, Configuration } from "openai-edge";
import { env } from "./env/server";

const configuration = new Configuration({
  apiKey: env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function getEmbeddings(text: string) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/(\r\n|\n|\r)/gm, ""),
    });
    const result = await response.json();
    return result.data[0].embedding as number[];
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get embeddings");
  }
}

import { getPineconeClient } from "./pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";
import { env } from "./env/server";

const MIN_CONTEXT_MATCH_SCORE = 0.2;

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);
  console.log("Pinecone matches", {
    index: env.PINECONE_INDEX_NAME,
    count: matches?.length ?? 0,
    scores: matches?.map((match) => match.score),
  });
  const qualifyDocs = matches?.filter(
    (match) => match.score && match.score >= MIN_CONTEXT_MATCH_SCORE,
  );
  type Metadata = {
    pageNumber: number;
    text: string;
  };

  const docs = qualifyDocs?.map((doc) => (doc.metadata as Metadata).text);
  return docs?.join("\n").substring(0, 3000);
}

async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string,
) {
  const pinecone = getPineconeClient();
  const pineconeIndex = await pinecone.Index(env.PINECONE_INDEX_NAME);
  try {
    const namespace = convertToAscii(fileKey);
    const queryResult = await pineconeIndex.namespace(namespace).query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    });
    return queryResult.matches || [];
  } catch (error) {
    console.error(error);
  }
}

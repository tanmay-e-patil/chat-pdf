import { getPineconeClient } from "./pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);
  const qualifyDocs = matches?.filter(
    (match) => match.score && match.score > 0.7,
  );
  type Metadata = {
    pageNumber: number;
    text: string;
  };

  const docs = qualifyDocs?.map((doc) => (doc.metadata as Metadata).text);
  return docs?.join("\n").substring(0, 3000);
}

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string,
) {
  const pinecone = getPineconeClient();
  const pineconeIndex = await pinecone.Index("chat-pdf");
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

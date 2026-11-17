import "server-only";
import {
  Pinecone,
  type PineconeRecord,
  type RecordMetadata,
} from "@pinecone-database/pinecone";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";
import { bedrockClient } from "@/lib/bedrock";
import { env } from "@/lib/env/server";
import type { Chunk } from "./chunk";
import { IndexFailure } from "./pdf";

export const INDEX_VERSION = 1;

export type Passage = {
  page: number;
  start: number;
  end: number;
  text: string;
  score?: number;
};

const metadataSchema = z.object({
  v: z.literal(INDEX_VERSION),
  page: z.number().int().positive(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  text: z.string().min(1),
});

const embeddingResponseSchema = z.object({ embedding: z.array(z.number()) });

const EMBED_CONCURRENCY = 8;
const UPSERT_BATCH = 100;
const FETCH_BATCH = 100;
const DELETE_BATCH = 1000;
const LIST_PAGE = 100;
const ID_PREFIX = `v${INDEX_VERSION}#`;

function namespaceOf(fileKey: string): string {
  return fileKey.replace(/[^\x00-\x7F]/g, "");
}

function vectorId(chunk: Pick<Chunk, "page" | "ordinal">): string {
  return `${ID_PREFIX}p${String(chunk.page).padStart(4, "0")}#c${String(chunk.ordinal).padStart(3, "0")}`;
}

function namespace(fileKey: string) {
  return new Pinecone({ apiKey: env.PINECONE_API_KEY })
    .index(env.PINECONE_INDEX_NAME)
    .namespace(namespaceOf(fileKey));
}

function toEmbeddingInput(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export async function embed(text: string): Promise<number[]> {
  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId: env.BEDROCK_EMBEDDING_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: toEmbeddingInput(text) }),
    }),
  );
  return embeddingResponseSchema.parse(
    JSON.parse(new TextDecoder().decode(response.body)),
  ).embedding;
}

export async function writeChunks(
  fileKey: string,
  chunks: Chunk[],
): Promise<void> {
  const records = await mapWithConcurrency(
    chunks,
    EMBED_CONCURRENCY,
    async (chunk): Promise<PineconeRecord> => {
      let values: number[];
      try {
        values = await embed(chunk.text);
      } catch (error) {
        console.error("embedding failed", error);
        throw new IndexFailure("embedding_failed");
      }
      return {
        id: vectorId(chunk),
        values,
        metadata: {
          v: INDEX_VERSION,
          page: chunk.page,
          start: chunk.start,
          end: chunk.end,
          text: chunk.text,
        },
      };
    },
  );
  const ns = namespace(fileKey);
  for (const batch of batches(records, UPSERT_BATCH)) {
    await ns.upsert(batch);
  }
}

export async function pruneOtherVersions(fileKey: string): Promise<void> {
  const ns = namespace(fileKey);
  const stale: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await ns.listPaginated({ limit: LIST_PAGE, paginationToken });
    for (const vector of page.vectors ?? []) {
      if (vector.id && !vector.id.startsWith(ID_PREFIX)) stale.push(vector.id);
    }
    paginationToken = page.pagination?.next;
  } while (paginationToken);
  for (const batch of batches(stale, DELETE_BATCH)) {
    await ns.deleteMany(batch);
  }
}

export async function deleteNamespace(fileKey: string): Promise<void> {
  await namespace(fileKey).deleteAll();
}

export async function listChunkIds(
  fileKey: string,
  limit: number,
): Promise<{ ids: string[]; truncated: boolean }> {
  const ns = namespace(fileKey);
  const ids: string[] = [];
  let paginationToken: string | undefined;
  do {
    const page = await ns.listPaginated({
      prefix: ID_PREFIX,
      limit: LIST_PAGE,
      paginationToken,
    });
    for (const vector of page.vectors ?? []) {
      if (vector.id) ids.push(vector.id);
    }
    paginationToken = page.pagination?.next;
  } while (paginationToken && ids.length <= limit);
  ids.sort();
  return { ids: ids.slice(0, limit), truncated: ids.length > limit };
}

export async function fetchPassages(
  fileKey: string,
  ids: string[],
): Promise<Passage[]> {
  const ns = namespace(fileKey);
  const passages: Passage[] = [];
  for (const batch of batches(ids, FETCH_BATCH)) {
    const { records } = await ns.fetch(batch);
    for (const id of batch) {
      const passage = parseMetadata(records[id]?.metadata);
      if (passage) passages.push(passage);
    }
  }
  return passages;
}

export async function queryPassages(
  fileKey: string,
  query: string,
  topK: number,
): Promise<Passage[]> {
  const { matches } = await namespace(fileKey).query({
    vector: await embed(query),
    topK,
    includeMetadata: true,
    filter: { v: { $eq: INDEX_VERSION } },
  });
  return (matches ?? []).flatMap((match) => {
    const passage = parseMetadata(match.metadata);
    return passage ? [{ ...passage, score: match.score }] : [];
  });
}

function parseMetadata(
  metadata: RecordMetadata | undefined,
): Omit<Passage, "score"> | null {
  const parsed = metadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data : null;
}

function batches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

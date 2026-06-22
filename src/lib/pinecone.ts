import "server-only";
import {
  Pinecone,
  PineconeRecord,
  RecordMetadata,
} from "@pinecone-database/pinecone";
import * as fs from "fs/promises";
import pdf from "pdf-parse";
import { downloadFromS3 } from "./s3-server";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import md5 from "md5";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";
import { env } from "./env/server";

export const getPineconeClient = () => {
  return new Pinecone({ apiKey: env.PINECONE_API_KEY });
};

type PDFPage = {
  pageContent: string;
  pageNumber: number;
};
export async function loadS3IntoPinecone(file_key: string) {
  const file_name = await downloadFromS3(file_key);
  if (!file_name) {
    throw new Error("Failed to download file from S3");
  }
  const pages = await loadPdfPages(file_name);
  const docs = await Promise.all(pages.map(prepareDocument));
  const flatDocs = docs.flat();
  console.log("PDF parsed", {
    fileKey: file_key,
    pages: pages.length,
    chunks: flatDocs.length,
    chars: flatDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0),
  });

  const vectors = await Promise.all(flatDocs.map(embedDocument));
  if (vectors.length === 0) throw new Error("No PDF text chunks to index");

  const pinecone = getPineconeClient();
  const pineconeIndex = await pinecone.Index(env.PINECONE_INDEX_NAME);
  const namespace = convertToAscii(file_key);
  await pineconeIndex.namespace(namespace).upsert(vectors);
  console.log("Pinecone upserted", {
    index: env.PINECONE_INDEX_NAME,
    fileKey: file_key,
    namespace,
    vectors: vectors.length,
    dimensions: vectors[0]?.values.length,
  });

  return docs[0];
}

export async function deleteFromPinecone(file_key: string) {
  const pinecone = getPineconeClient();
  const pineconeIndex = await pinecone.Index(env.PINECONE_INDEX_NAME);
  const namespace = convertToAscii(file_key);
  await pineconeIndex.namespace(namespace).deleteAll();
}

export const trucateStringByBytes = (str: string, bytes: number) => {
  const encoder = new TextEncoder();
  return new TextDecoder("utf-8").decode(encoder.encode(str).slice(0, bytes));
};
async function loadPdfPages(fileName: string): Promise<PDFPage[]> {
  const data = await fs.readFile(fileName);
  const result = await pdf(data);
  // ponytail: pdf-parse v1 gives whole-document text; restore per-page metadata only if citations need it.
  return [{ pageContent: result.text, pageNumber: 1 }].filter((page) =>
    page.pageContent.trim(),
  );
}

async function prepareDocument(page: PDFPage) {
  let { pageContent } = page;
  pageContent = pageContent.replace(/(\r\n|\n|\r)/gm, "");
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent: pageContent,
      metadata: {
        pageNumber: page.pageNumber,
        text: trucateStringByBytes(pageContent, 36_000),
      },
    }),
  ]);
  return docs;
}

async function embedDocument(doc: Document): Promise<PineconeRecord> {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      } as RecordMetadata,
    } as PineconeRecord<RecordMetadata>;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to embed document");
  }
}

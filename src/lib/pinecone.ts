import { Pinecone, PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {Document, RecursiveCharacterTextSplitter} from "@pinecone-database/doc-splitter"
import md5 from "md5";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient =  () => {
    return new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
}

type PDFPage = {
    pageContent: string;
    metadata: {
        loc: {
            pageNumber: number;
        }
    }
}
export async function loadS3IntoPinecone(file_key: string) {
    const file_name = await downloadFromS3(file_key);
    console.log(file_name);
    if (!file_name) {
        throw new Error("Failed to download file from S3");
    }
    const loader = new PDFLoader(file_name);
    const pages = await loader.load() as PDFPage[];
    console.log("Preparing documents");
    const docs = await Promise.all(pages.map(prepareDocument));
    console.log("Embedding documents");
    const vectors = await Promise.all(docs.flat().map(embedDocument));
    console.log("Connecting to Pinecone");
    const pinecone = getPineconeClient();
    console.log("Creating index");
    const pineconeIndex = await pinecone.Index('chat-pdf');
    console.log("Inserting vectors");
    const namespace = convertToAscii(file_key);
    await pineconeIndex.namespace(namespace).upsert(vectors);


    
    return docs[0];
}
export const trucateStringByBytes = (str: string, bytes: number) => {
    const encoder = new TextEncoder();
    return new TextDecoder('utf-8').decode(encoder.encode(str).slice(0, bytes));
}
async function prepareDocument(page: PDFPage) {
    let {pageContent} = page;
    const {metadata} = page
    pageContent = pageContent.replace(/(\r\n|\n|\r)/gm, "");
    const splitter = new RecursiveCharacterTextSplitter();
    const docs = await splitter.splitDocuments([
        new Document({
            pageContent: pageContent,
            metadata: {
                pageNumber: metadata.loc.pageNumber,
                text: trucateStringByBytes(pageContent, 36_000)
            }
        })
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
                pageNumber: doc.metadata.pageNumber
            } as RecordMetadata

        } as PineconeRecord<RecordMetadata>;
        
    } catch (error) {
        console.error(error);
        throw new Error("Failed to embed document");
        
    }
}
import { Pinecone } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
export const getPineconeClient =  () => {
    return new Pinecone({apiKey: process.env.PINECONE_API_KEY!});
}

export async function loadS3IntoPinecone(file_key: string) {
    const file_name = await downloadFromS3(file_key);
    console.log(file_name);
    if (!file_name) {
        throw new Error("Failed to download file from S3");
    }
    const loader = new PDFLoader(file_name);
    const pages = await loader.load();
    return pages;
}
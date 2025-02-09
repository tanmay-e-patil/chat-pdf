import { loadS3IntoPinecone } from "@/lib/pinecone";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { file_key } = body;
    const pages = await loadS3IntoPinecone(file_key);
    console.log(pages);
    return NextResponse.json({ pages });
  }
  catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" + e }, { status: 500 });
  }  
}
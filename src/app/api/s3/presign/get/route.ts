import { getS3PresignedUrl } from "@/lib/s3";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get("file_key");
    if (!fileKey) {
      return NextResponse.json(
        { error: "Missing or invalid object key" },
        { status: 400 },
      );
    }

    const presignedUrl = await getS3PresignedUrl(fileKey);

    const response = {
      presignedUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Missing or invalid object key" },
      { status: 500 },
    );
  }
}

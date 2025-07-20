import { envClient } from "@/lib/env/client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { S3 } from "@/lib/s3/S3Client";

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const fileKey = body.key;

    if (!fileKey) {
      return NextResponse.json(
        { error: "Missing or invalid object key" },
        { status: 400 },
      );
    }

    const command = new DeleteObjectCommand({
      Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME,
      Key: fileKey,
    });

    await S3.send(command);
    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Missing or invalid object key" },
      { status: 500 },
    );
  }
}

import { envClient } from "@/lib/env/client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from "@/lib/s3/S3Client";
import * as Sentry from "@sentry/nextjs";

const fileUploadSchema = z.object({
  fileName: z.string().min(1, { message: "File name is required" }),
  contentType: z.string().min(1, { message: "Content type is required" }),
  size: z.number().min(1, { message: "Size is required" }),
  isPDF: z.boolean(),
});
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = fileUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid Request Body" },
        { status: 400 },
      );
    }
    const { fileName, contentType, size } = validation.data;

    const fileKey = `uploads/${uuidv4()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME,
      ContentType: contentType,
      ContentLength: size,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(S3, command, {
      expiresIn: 300,
    });

    const response = {
      presignedUrl,
      key: fileKey,
    };

    return NextResponse.json(response);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error: "Failed to generate presigned URL",
      },
      {
        status: 500,
      },
    );
  }
}

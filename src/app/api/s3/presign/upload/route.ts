import { getAuthenticatedUserId } from "@/lib/authz";
import { env } from "@/lib/env/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3 } from "@/lib/s3/S3Client";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_CONTENT_TYPE = "application/pdf";

const fileUploadSchema = z.object({
  fileName: z.string().min(1, { message: "File name is required" }),
  contentType: z.literal(PDF_CONTENT_TYPE),
  size: z
    .number()
    .int()
    .min(1, { message: "Size is required" })
    .max(MAX_UPLOAD_SIZE_BYTES, { message: "File must be 10MB or smaller" }),
});
export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = fileUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid Request Body" },
        { status: 400 },
      );
    }
    const { fileName, contentType, size } = validation.data;

    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `uploads/${userId}/${uuidv4()}-${safeFileName}`;
    const command = new PutObjectCommand({
      Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME,
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
    console.error(error);
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

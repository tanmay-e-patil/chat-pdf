import "server-only";
import { envClient } from "./env/client";
import { env } from "./env/server";
import { S3 } from "./s3/S3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

export async function getS3PresignedUrl(file_key: string) {
  const command = new GetObjectCommand({
    Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME,
    Key: file_key,
  });
  return await getSignedUrl(S3, command, { expiresIn: 300 }); // 5 minutes
}

export function getS3Url(file_key: string) {
  return `https://${envClient.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${file_key}`;
}

export async function deleteFromS3(file_key: string) {
  try {
    await S3.send(
      new DeleteObjectCommand({
        Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME,
        Key: file_key,
      }),
    );
    console.log("Successfully deleted from S3");
    return { file_key };
  } catch (error) {
    console.error(error);
  }
}

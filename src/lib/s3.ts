import "server-only";
import AWS from "aws-sdk";
import { envClient } from "./env/client";
import { env } from "./env/server";
import { S3 } from "./s3/S3Client";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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
    AWS.config.update({
      region: env.AWS_REGION,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: { Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME },
      region: env.AWS_REGION,
    });
    const params = {
      Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
    };

    const del = s3.deleteObject(params).promise();

    await del.then(() => {
      console.log("Successfully deleted from S3");
    });

    return Promise.resolve({ file_key });
  } catch (error) {
    console.error(error);
  }
}

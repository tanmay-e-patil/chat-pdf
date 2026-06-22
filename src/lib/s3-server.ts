import "server-only";
import * as fs from "fs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "./s3/S3Client";
import { env } from "./env/server";

export async function downloadFromS3(file_key: string) {
  console.log(file_key);
  try {
    const obj = await S3.send(
      new GetObjectCommand({
        Bucket: env.NEXT_PUBLIC_S3_BUCKET_NAME,
        Key: file_key,
      }),
    );

    const file_name = `/tmp/pdf-${Date.now()}.pdf`;
    if (obj.Body) {
      const bytes = await obj.Body.transformToByteArray();
      fs.writeFileSync(file_name, Buffer.from(bytes));
    }
    return file_name;
  } catch (error) {
    console.error(error);
    return null;
  }
}

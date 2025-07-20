import "server-only";
import { S3 } from "aws-sdk";
import * as fs from "fs";
import { env } from "./env/server";
import { envClient } from "./env/client";
export async function downloadFromS3(file_key: string) {
  console.log(file_key);
  try {
    const s3 = new S3({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const params = {
      Bucket: envClient.NEXT_PUBLIC_S3_BUCKET_NAME,
      Key: file_key,
    };

    const obj = await s3.getObject(params).promise();
    const file_name = `/tmp/pdf-${Date.now()}.pdf`;
    fs.writeFileSync(file_name, obj.Body as Buffer);
    return file_name;
  } catch (error) {
    console.error(error);
    return null;
  }
}

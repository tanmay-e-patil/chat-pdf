import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "../env/server";
export const S3 = new S3Client({
  region: env.AWS_REGION,
});

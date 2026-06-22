import "server-only";
import { env } from "../env/server";

export const s3Region = env.S3_BUCKET_REGION ?? env.AWS_REGION;

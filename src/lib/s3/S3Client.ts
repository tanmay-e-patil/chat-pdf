import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { awsConfig } from "../aws";
import { s3Region } from "./config";

export const S3 = new S3Client({ ...awsConfig(), region: s3Region });

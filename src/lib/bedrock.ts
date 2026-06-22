import "server-only";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { awsConfig } from "./aws";
import { env } from "./env/server";

export const bedrockClient = new BedrockRuntimeClient(awsConfig());

export const bedrock = createAmazonBedrock({
  ...awsConfig(),
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  sessionToken: env.AWS_SESSION_TOKEN,
});

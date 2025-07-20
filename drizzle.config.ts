import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
import { env } from "@/lib/env/server";

dotenv.config({ path: ".env" });
export default {
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;

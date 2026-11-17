import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "dist/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/document-index/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@pinecone-database/pinecone",
              message: "Pinecone is owned by @/lib/document-index.",
            },
            {
              name: "pdf-parse",
              message: "PDF extraction is owned by @/lib/document-index.",
            },
          ],
          patterns: [
            {
              group: [
                "@/lib/document-index/internal/*",
                "**/document-index/internal/*",
                "@/lib/document-index/lambda",
              ],
              message:
                "Use @/lib/document-index (server) or @/lib/document-index/shared (client-safe).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;

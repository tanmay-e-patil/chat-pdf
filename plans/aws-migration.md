# AWS Migration Plan

Scope: move third-party runtime services to AWS while keeping Neon Postgres and optionally Vercel for Next.js hosting.

## Target stack

| Current | Target | Notes |
|---|---|---|
| Vercel hosting | Vercel | Allowed exception. Keep unless AWS hosting is later required. |
| Neon Postgres | Neon Postgres | Allowed exception. No DB migration needed. |
| S3 | S3 | Already mostly done. Tighten bucket/IAM/CORS. |
| Pinecone vectors | Amazon OpenSearch Serverless vector engine | Smallest AWS-native replacement for vector search. |
| OpenAI chat + embeddings | Amazon Bedrock | Use one chat model and one embedding model. |
| Clerk auth | Amazon Cognito | Biggest app change. User IDs will change unless mapped. |
| Stripe billing | Keep Stripe for now | AWS has no direct Stripe replacement. Replacing billing is a product rewrite, not infra migration. |
| Infisical / local secrets | Vercel env vars + AWS IAM | Since app stays on Vercel, runtime env vars are simplest. |

## Phase 0 — Freeze current behavior

- Document current env vars and production values owner.
- Add one smoke checklist: sign up/sign in, upload PDF, chat with PDF, delete chat, subscribe/manage billing.
- Export Clerk users and capture current `userId` format in `chats`, `messages`, `user_subscriptions`.

Exit: current app can be verified before/after each cutover.

## Phase 1 — AWS account baseline

- Create one AWS account/env for the app.
- Create least-privilege IAM user/role for Vercel runtime:
  - S3 object read/write/delete for the app bucket.
  - Bedrock invoke model.
  - OpenSearch Serverless collection read/write.
- Keep credentials in Vercel env vars for now.
- Enable CloudTrail and budget alert.

Exit: Vercel can call AWS without broad admin credentials.

## Phase 2 — Harden existing S3

- Keep existing S3 code paths: `src/lib/s3*.ts`, `src/app/api/s3/**`.
- Configure bucket:
  - block public access on,
  - CORS only for Vercel domains and local dev,
  - lifecycle cleanup for abandoned uploads if desired.
- Remove direct public URL assumptions where possible; prefer presigned GET URLs.

Exit: uploads/downloads/deletes work through presigned URLs only.

## Phase 3 — Replace OpenAI with Bedrock

- Add a tiny provider wrapper for:
  - chat completion in `src/app/api/ai/route.ts`,
  - embeddings in `src/lib/embeddings.ts`.
- Pick models:
  - chat: Claude 3.5/3.7 Sonnet or Amazon Nova,
  - embeddings: Amazon Titan Text Embeddings v2.
- Env changes:
  - add `AWS_BEDROCK_REGION` if different from `AWS_REGION`,
  - remove `OPENAI_API_KEY` after cutover.
- Keep prompts and response streaming behavior unchanged where practical.

Exit: PDF chat and embedding generation run through Bedrock.

## Phase 4 — Replace Pinecone with OpenSearch Serverless vectors

- Create OpenSearch Serverless vector collection and index for `chat-pdf`.
- Match embedding dimension to the Bedrock embedding model.
- Replace:
  - `src/lib/pinecone.ts` with OpenSearch upsert/delete code,
  - `src/lib/context.ts` with OpenSearch k-NN query code.
- Preserve namespace behavior using `fileKey` as a metadata filter.
- Re-index existing PDFs from S3 rather than migrating Pinecone data.

Exit: new and existing PDFs retrieve context from OpenSearch.

## Phase 5 — Replace Clerk with Cognito

- Create Cognito User Pool + hosted UI or custom auth pages.
- Replace Clerk usage:
  - `src/middleware.ts`,
  - `src/app/(auth)/**`,
  - `src/app/(app)/layout.tsx`,
  - imports of `auth`, `currentUser`, `UserButton`.
- Store Cognito `sub` as the app `userId`.
- For existing users, add a one-time mapping table or migration from Clerk ID to Cognito sub.
- Update Stripe customer lookup to use the new `userId`.

Exit: users can sign in with Cognito and still see their chats/subscription.

## Phase 6 — Billing decision

Stripe is not an AWS dependency with a clean AWS-native equivalent.

Default: keep Stripe and document it as a non-AWS product dependency.

Only replace Stripe if product requirements demand it. That means building billing/subscription flows yourself around AWS Marketplace or another processor, which is larger than this migration.

## Phase 7 — Cleanup

- Remove packages no longer used:
  - `@clerk/nextjs`,
  - `@pinecone-database/pinecone`,
  - `@ai-sdk/openai`,
  - `openai-edge`,
  - maybe `@pinecone-database/doc-splitter` if replaced with LangChain splitter.
- Remove env vars:
  - `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_*`,
  - `PINECONE_*`,
  - `OPENAI_API_KEY`.
- Update `README.md` env docs.
- Run smoke checklist.

## Suggested order

1. S3 hardening.
2. Bedrock chat/embeddings.
3. OpenSearch vectors + re-index.
4. Cognito auth.
5. Cleanup.

Do Cognito last because it touches user identity, subscriptions, middleware, and UI.

## Risks

- Cognito user ID migration can orphan existing chats if not mapped.
- Bedrock embedding model dimension changes require full vector re-index.
- OpenSearch query behavior will not exactly match Pinecone ranking.
- Vercel-hosted app still needs AWS credentials unless moved to AWS hosting later.
- Stripe remains non-AWS unless explicitly accepted as an exception.

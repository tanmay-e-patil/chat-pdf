import "server-only";
import { rm } from "fs/promises";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { and, eq, isNull, lt, or, type SQL } from "drizzle-orm";
import { awsConfig } from "@/lib/aws";
import { db } from "@/lib/db";
import { chats, type DrizzleChat } from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import { downloadFromS3 } from "@/lib/s3-server";
import {
  INDEX_FAILURES,
  type IndexFailureCode,
  type IndexState,
} from "../shared";
import { chunkPage } from "./chunk";
import { IndexFailure, extractPdfPages } from "./pdf";
import {
  INDEX_VERSION,
  deleteNamespace,
  pruneOtherVersions,
  writeChunks,
} from "./store";

// Lambda's hard maximum, so this never needs syncing with terraform's configured timeout.
const INDEXING_TIMEOUT_MS = 15 * 60_000;

export type IndexTrigger = "upload" | "view" | "retry" | "backfill";

export type IndexJob = { chatId: string; fileKey: string; attempt: string };

const lambda = new LambdaClient(awsConfig());

export function indexStateOf(
  chat: DrizzleChat,
  now: Date = new Date(),
): IndexState {
  switch (chat.ingestionStatus) {
    case "ready":
      return chat.indexVersion >= INDEX_VERSION
        ? { status: "ready" }
        : { status: "stale" };
    case "processing":
      if (!chat.ingestionStartedAt) return { status: "queued" };
      if (
        now.getTime() - chat.ingestionStartedAt.getTime() >
        INDEXING_TIMEOUT_MS
      ) {
        return failed("timed_out");
      }
      return {
        status: "indexing",
        since: chat.ingestionStartedAt.toISOString(),
      };
    case "failed":
      return failed(parseFailureCode(chat.ingestionError));
  }
}

function failed(reason: IndexFailureCode): IndexState {
  return {
    status: "failed",
    reason,
    retryable: INDEX_FAILURES[reason].retryable,
  };
}

function parseFailureCode(raw: string | null): IndexFailureCode {
  return raw !== null && raw in INDEX_FAILURES
    ? (raw as IndexFailureCode)
    : "unknown";
}

// The only way to start, retry, or upgrade indexing. Safe to call on every page view.
export async function ensureIndexed(
  chat: DrizzleChat,
  trigger: IndexTrigger,
): Promise<IndexState> {
  const state = indexStateOf(chat);
  if (!isClaimable(state, trigger)) return state;

  const attempt = new Date();
  const [claimed] = await db
    .update(chats)
    .set({
      ingestionStatus: "processing",
      ingestionError: null,
      ingestionStartedAt: attempt,
    })
    .where(and(eq(chats.id, chat.id), claimablePredicate(trigger)))
    .returning();
  if (!claimed) {
    const [fresh] = await db.select().from(chats).where(eq(chats.id, chat.id));
    return fresh ? indexStateOf(fresh) : state;
  }

  const job: IndexJob = {
    chatId: chat.id,
    fileKey: chat.fileKey,
    attempt: attempt.toISOString(),
  };
  try {
    await dispatch(job);
  } catch (error) {
    console.error("index dispatch failed", { chatId: chat.id, error });
    await finishAttempt(job, { ok: false, code: "dispatch_failed" });
    return failed("dispatch_failed");
  }
  return { status: "indexing", since: job.attempt };
}

function isClaimable(state: IndexState, trigger: IndexTrigger): boolean {
  switch (state.status) {
    case "queued":
    case "stale":
      return true;
    case "failed":
      return trigger === "retry" && state.retryable;
    case "indexing":
    case "ready":
      return false;
  }
}

// Mirrors isClaimable in SQL so concurrent callers dispatch at most once.
function claimablePredicate(trigger: IndexTrigger): SQL {
  const queued = and(
    eq(chats.ingestionStatus, "processing"),
    isNull(chats.ingestionStartedAt),
  );
  const stale = and(
    eq(chats.ingestionStatus, "ready"),
    lt(chats.indexVersion, INDEX_VERSION),
  );
  if (trigger !== "retry") return or(queued, stale)!;
  const timedOut = and(
    eq(chats.ingestionStatus, "processing"),
    lt(chats.ingestionStartedAt, new Date(Date.now() - INDEXING_TIMEOUT_MS)),
  );
  return or(queued, stale, eq(chats.ingestionStatus, "failed"), timedOut)!;
}

async function dispatch(job: IndexJob): Promise<void> {
  if (!env.AWS_INGESTION_LAMBDA_NAME) {
    if (process.env.NODE_ENV === "development") {
      // Dev only: production must use Lambda so PDF bytes stay in AWS.
      void runIndexJob(job);
      return;
    }
    throw new Error("AWS_INGESTION_LAMBDA_NAME is required");
  }
  await lambda.send(
    new InvokeCommand({
      FunctionName: env.AWS_INGESTION_LAMBDA_NAME,
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(job)),
    }),
  );
}

// Never throws: a recorded failure must not trigger Lambda's async auto-retry.
export async function runIndexJob(job: IndexJob): Promise<void> {
  if (!(await attemptIsCurrent(job))) return;
  let path: string | null = null;
  try {
    path = await downloadFromS3(job.fileKey);
    if (!path) throw new IndexFailure("file_missing");

    const pages = await extractPdfPages(path);
    await writeChunks(job.fileKey, pages.flatMap(chunkPage));

    const finished = await finishAttempt(job, { ok: true });
    if (finished === "chat-deleted") {
      await deleteNamespace(job.fileKey);
    } else if (finished === "applied") {
      await pruneOtherVersions(job.fileKey).catch((error) =>
        console.error("prune failed", error),
      );
    }
  } catch (error) {
    const code: IndexFailureCode =
      error instanceof IndexFailure ? error.code : "unknown";
    console.error("index job failed", { chatId: job.chatId, code, error });
    await finishAttempt(job, { ok: false, code }).catch((dbError) =>
      console.error("recording index failure failed", dbError),
    );
  } finally {
    if (path) await rm(path, { force: true });
  }
}

async function finishAttempt(
  job: IndexJob,
  outcome: { ok: true } | { ok: false; code: IndexFailureCode },
): Promise<"applied" | "superseded" | "chat-deleted"> {
  const [updated] = await db
    .update(chats)
    .set(
      outcome.ok
        ? {
            ingestionStatus: "ready",
            indexVersion: INDEX_VERSION,
            ingestionError: null,
          }
        : { ingestionStatus: "failed", ingestionError: outcome.code },
    )
    .where(currentAttempt(job))
    .returning({ id: chats.id });
  if (updated) return "applied";
  const [exists] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.id, job.chatId));
  return exists ? "superseded" : "chat-deleted";
}

async function attemptIsCurrent(job: IndexJob): Promise<boolean> {
  const [row] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(currentAttempt(job));
  return Boolean(row);
}

function currentAttempt(job: IndexJob): SQL {
  return and(
    eq(chats.id, job.chatId),
    eq(chats.ingestionStatus, "processing"),
    eq(chats.ingestionStartedAt, new Date(job.attempt)),
  )!;
}

export async function deleteDocumentIndex(chat: DrizzleChat): Promise<void> {
  await deleteNamespace(chat.fileKey);
}

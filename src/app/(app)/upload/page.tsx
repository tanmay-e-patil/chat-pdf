import { Uploader } from "@/components/file-uploader/Uploader";
import SubscriptionButton from "@/components/SubscriptionButton";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { checkSubscription } from "@/lib/subscriptions";
import { auth } from "@clerk/nextjs/server";
import { count, eq } from "drizzle-orm";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const steps = ["Drop your PDF", "We index the content", "Ask with citations"];

export default async function UploadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/upload");
  }

  const [isPro, userChats] = await Promise.all([
    checkSubscription(userId),
    db.select().from(chats).where(eq(chats.userId, userId)).execute(),
  ]);
  const firstChat = userChats[0] as { id: string } | undefined;
  let isUploadAllowed = true;

  if (!isPro && firstChat) {
    const [{ count: chatCount }] = await db
      .select({ count: count() })
      .from(chats)
      .where(eq(chats.userId, userId))
      .execute();
    isUploadAllowed = chatCount < 1;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(74,222,128,.2),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(96,165,250,.18),transparent_28%),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:auto,auto,88px_88px]" />
      <div className="pointer-events-none fixed inset-x-6 top-0 h-full border-x border-white/10" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          {firstChat && (
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/15 bg-white/[.03] text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={`/chat/${firstChat.id}`}>Open workspace</Link>
            </Button>
          )}
          <SubscriptionButton isPro={isPro} />
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[.9fr_1.1fr] lg:py-24">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
            <Sparkles className="size-4" /> Focus mode for your next document
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-balance md:text-7xl">
            Upload once. Ask until it clicks.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Drop a PDF and jump straight into a cited chat workspace built for
            decisions, not file management.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-3xl border border-white/10 bg-white/[.04] p-4"
              >
                <p className="text-sm text-emerald-300">0{index + 1}</p>
                <p className="mt-6 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative rounded-[2.5rem] border border-white/10 bg-white/[.05] p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-emerald-400 text-slate-950">
                  <FileText className="size-5" />
                </span>
                <div>
                  <p className="font-medium">PDF intake</p>
                  <p className="text-sm text-slate-400">10MB max · PDF only</p>
                </div>
              </div>
              <span className="hidden items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200 sm:flex">
                <CheckCircle2 className="size-4" /> Secure upload
              </span>
            </div>

            <div className="rounded-[2rem] border border-dashed border-white/20 bg-slate-950/60 p-4">
              {isUploadAllowed ? (
                <Uploader />
              ) : (
                <div className="rounded-[1.5rem] border border-red-300/20 bg-red-500/10 p-6">
                  <div className="flex items-center gap-3 text-red-100">
                    <Lock className="size-5" /> Free PDF limit reached.
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    Upgrade to analyze more documents without leaving your
                    workspace.
                  </p>
                  <div className="mt-5">
                    <SubscriptionButton isPro={isPro} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

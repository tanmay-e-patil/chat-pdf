import { Button } from "@/components/ui/button";
import SubscriptionButton from "@/components/SubscriptionButton";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { checkSubscription } from "@/lib/subscriptions";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  MessageSquareText,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

const ctaLabel = "Start analyzing free";

const megaMenu = [
  ["For research", "Find answers across dense papers in seconds."],
  ["For teams", "Share cited decisions without another meeting."],
  ["For students", "Turn chapters into clear study notes."],
  ["Security", "Your documents stay private by design."],
];

const benefits = [
  {
    icon: Search,
    title: "Get the answer, not the page hunt",
    text: "Ask naturally and jump straight to cited passages that prove the answer.",
  },
  {
    icon: MessageSquareText,
    title: "Keep context across every follow-up",
    text: "The chat remembers the document trail so your next question starts ahead.",
  },
  {
    icon: Zap,
    title: "Compress hours into a review loop",
    text: "Summarize, compare, extract actions, and move on while the insight is fresh.",
  },
];

const steps = ["Upload PDF", "Ask in plain English", "Use cited answers"];

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  let isPro = false;
  let firstChat: { id: string } | undefined;

  if (userId) {
    const [subscription, userChats] = await Promise.all([
      checkSubscription(userId),
      db.select().from(chats).where(eq(chats.userId, userId)).execute(),
    ]);

    isPro = subscription;
    firstChat = userChats[0];
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(74,222,128,.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(96,165,250,.2),transparent_30%),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:auto,auto,88px_88px]" />
      <div className="pointer-events-none fixed inset-x-6 top-0 h-full border-x border-white/10" />

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-slate-950 shadow-[0_0_40px_rgba(52,211,153,.45)]">
            <FileText className="size-5" />
          </span>
          ChatPDF
        </Link>

        <div className="group relative hidden md:block">
          <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[.08] hover:text-white">
            Solutions <ChevronDown className="size-4" />
          </button>
          <div className="invisible absolute left-1/2 top-12 w-[560px] -translate-x-1/2 translate-y-2 rounded-3xl border border-white/10 bg-slate-950/90 p-3 opacity-0 shadow-2xl shadow-black/40 backdrop-blur-2xl transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <div className="grid grid-cols-2 gap-2">
              {megaMenu.map(([title, text]) => (
                <Link
                  href="/sign-in"
                  key={title}
                  className="rounded-2xl p-4 transition hover:bg-white/[.06]"
                >
                  <p className="font-medium text-white">{title}</p>
                  <p className="mt-1 text-sm text-slate-400">{text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuth && <SubscriptionButton isPro={isPro} />}
          <Button
            asChild
            className="rounded-full bg-emerald-400 px-5 text-slate-950 hover:bg-emerald-300"
          >
            <Link href={isAuth ? "/upload" : "/sign-in?redirect_url=/upload"}>
              {ctaLabel}
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-14 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm text-emerald-200">
              <Sparkles className="size-4" /> Cited AI answers for serious PDFs
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-balance md:text-7xl">
              Stop reading PDFs. Start extracting decisions.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              ChatPDF turns reports, papers, contracts, and manuals into a cited
              answer engine your team can trust.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-emerald-400 px-7 text-base text-slate-950 hover:bg-emerald-300"
              >
                <Link
                  href={isAuth ? "/upload" : "/sign-in?redirect_url=/upload"}
                >
                  {ctaLabel} <ArrowRight className="size-5" />
                </Link>
              </Button>
              {isAuth && firstChat && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/[.03] px-7 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={`/chat/${firstChat.id}`}>Open workspace</Link>
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400">
              {["No credit card", "Private uploads", "Citations included"].map(
                (item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-300" /> {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <ProductFrame />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div
              key={benefit.title}
              className={`group rounded-[2rem] border border-white/10 bg-white/[.04] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[.07] ${
                index === 1 ? "md:translate-y-8" : ""
              }`}
            >
              <benefit.icon className="size-6 text-emerald-300 transition group-hover:scale-110" />
              <h2 className="mt-8 text-2xl font-semibold tracking-tight">
                {benefit.title}
              </h2>
              <p className="mt-3 text-slate-400">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-4 lg:grid-cols-[1fr_.8fr]">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[.04] p-4 shadow-2xl shadow-emerald-950/20">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="rounded-[1.75rem] bg-slate-950/70 p-6"
                >
                  <p className="text-sm text-emerald-300">0{index + 1}</p>
                  <p className="mt-10 text-xl font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="group rounded-[2.5rem] border border-emerald-300/20 bg-emerald-300/10 p-6 backdrop-blur-xl transition hover:bg-emerald-300/15">
            <h2 className="text-3xl font-semibold tracking-tight">
              Drop in a PDF. Leave with answers.
            </h2>
            <p className="mt-4 text-slate-300">
              Upload happens in a focused workspace, so this page can sell the
              outcome and the app can do the work.
            </p>
            <div className="mt-8 rounded-[2rem] border border-dashed border-white/20 bg-slate-950/60 p-4">
              <Button
                asChild
                className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                <Link
                  href={isAuth ? "/upload" : "/sign-in?redirect_url=/upload"}
                >
                  {ctaLabel}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductFrame() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex gap-2 border-b border-white/10 p-3">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-amber-300" />
          <span className="size-3 rounded-full bg-emerald-300" />
        </div>
        <div className="grid min-h-[520px] gap-3 p-3 md:grid-cols-[.95fr_1.05fr]">
          <div className="overflow-hidden rounded-3xl bg-white text-slate-950">
            <div className="h-10 bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">
              annual-report.pdf
            </div>
            <div className="space-y-4 p-6">
              <div className="h-5 w-2/3 rounded bg-slate-900" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-20 rounded-2xl bg-emerald-100" />
                <div className="h-20 rounded-2xl bg-blue-100" />
                <div className="h-20 rounded-2xl bg-violet-100" />
              </div>
              <div className="space-y-2">
                {["w-full", "w-11/12", "w-4/5", "w-10/12"].map((width) => (
                  <div
                    key={width}
                    className={`h-3 ${width} rounded bg-slate-200`}
                  />
                ))}
              </div>
              <div className="rounded-2xl border-l-4 border-emerald-400 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
                Revenue retention rose 18% after support automation shipped.
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-3xl border border-white/10 bg-white/[.04] p-4">
            <div className="mb-4 flex rounded-full bg-white/[.06] p-1 text-sm text-slate-300">
              {["Summary", "Risks", "Actions"].map((tab, index) => (
                <span
                  key={tab}
                  className={`flex-1 rounded-full px-3 py-2 text-center transition ${index === 0 ? "bg-emerald-400 text-slate-950" : "hover:bg-white/10"}`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="mt-auto space-y-3">
              <div className="ml-10 rounded-3xl bg-emerald-400 p-4 text-sm font-medium text-slate-950">
                What changed growth last quarter?
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-slate-200">
                Growth came from faster onboarding and higher expansion revenue.
                The source cites a 31% activation lift and 18% retention gain.
                <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-200">
                  Source: page 14
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[.04] p-3 text-sm text-slate-400">
                Ask a follow-up…
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

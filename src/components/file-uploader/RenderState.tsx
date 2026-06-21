import { cn } from "@/lib/utils";
import { CheckCircle2, CloudUploadIcon, Loader2, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

export function RenderEmptyState({ isDragActive }: { isDragActive: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className={cn(
            "mb-5 grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[.06] transition",
            isDragActive && "scale-105 border-emerald-300/40 bg-emerald-300/15",
          )}
        >
          <CloudUploadIcon
            className={cn(
              "size-7 text-slate-300 transition",
              isDragActive && "text-emerald-300",
            )}
          />
        </div>
        <p className="text-3xl font-semibold tracking-[-0.04em] text-white">
          {isDragActive ? "Release to analyze." : "Drop your PDF here."}
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
          Turn dense documents into cited answers. PDF only, up to 10MB.
        </p>
        <Button
          className="mt-6 w-fit rounded-full bg-emerald-400 px-6 text-slate-950 hover:bg-emerald-300"
          type="button"
        >
          Select PDF
        </Button>
      </div>
    </div>
  );
}

export function RenderErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-red-300/20 bg-red-500/10">
        <XCircle className="size-7 text-red-200" />
      </div>
      <p className="text-xl font-semibold text-white">Upload stopped</p>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        {message ?? "Try a PDF under 10MB."}
      </p>
      <Button
        type="button"
        className="mt-5 rounded-full bg-white text-slate-950 hover:bg-slate-200"
      >
        Choose another PDF
      </Button>
    </div>
  );
}

export function RenderUploadingState({
  progress,
  file,
}: {
  progress: number;
  file: File;
}) {
  return (
    <div className="flex w-full max-w-xl flex-col justify-center">
      <div className="mb-5 flex items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-emerald-300/10">
          <Loader2 className="size-7 animate-spin text-emerald-300" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-white">Indexing your PDF…</p>
          <p className="mt-1 truncate text-sm text-slate-400">{file.name}</p>
        </div>
      </div>
      <Progress
        value={progress}
        className="h-3 bg-white/10 [&>div]:bg-emerald-400"
      />
      <div className="mt-3 flex justify-between text-xs text-slate-400">
        <span>Uploading securely</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

export function RenderUploadedState() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-300/10">
        <CheckCircle2 className="size-7 text-emerald-300" />
      </div>
      <p className="text-xl font-semibold text-white">PDF ready</p>
      <p className="mt-2 text-sm text-slate-400">
        Opening your chat workspace…
      </p>
      <Loader2 className="mt-5 size-8 animate-spin text-emerald-300" />
    </div>
  );
}

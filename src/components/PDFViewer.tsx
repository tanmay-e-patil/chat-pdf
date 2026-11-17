"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PageJump } from "./ChatWorkspace";

type Props = {
  fileKey: string;
  jump: PageJump | null;
};

const VIEW_PARAMS = "toolbar=0&navpanes=0&view=Fit";

function PDFViewer({ fileKey, jump }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: baseUrl, isPending } = useQuery({
    queryKey: ["preview", fileKey],
    queryFn: async () => {
      const response = await fetch(
        `/api/s3/presign/get?file_key=${encodeURIComponent(fileKey)}`,
      );
      const result = (await response.json()) as { presignedUrl: string };
      return result.presignedUrl;
    },
    // Swapping the base URL would reload the viewer and lose the reader's place.
    staleTime: Infinity,
  });

  // Fragment-only changes navigate within the loaded PDF, so the presigned URL's expiry doesn't matter.
  useEffect(() => {
    if (!jump || !baseUrl || !iframeRef.current) return;
    iframeRef.current.src = `${baseUrl}#page=${jump.page}&${VIEW_PARAMS}`;
  }, [jump, baseUrl]);

  return (
    <div className="grid h-full w-full place-items-center bg-white">
      {isPending ? (
        <Loader2 className="size-12 animate-spin text-emerald-500" />
      ) : (
        <iframe
          ref={iframeRef}
          src={`${baseUrl}#${VIEW_PARAMS}`}
          title="PDF preview"
          sandbox="allow-scripts allow-same-origin allow-downloads"
          className="h-full w-full"
        />
      )}
    </div>
  );
}

export default PDFViewer;

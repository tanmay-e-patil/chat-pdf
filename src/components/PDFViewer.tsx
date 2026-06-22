"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import React from "react";

type Props = {
  file_key: string;
};

function PDFViewer({ file_key }: Props) {
  const { data, isPending } = useQuery({
    queryKey: ["preview", file_key],
    queryFn: async () => {
      const response = await fetch(
        `/api/s3/presign/get?file_key=${encodeURIComponent(file_key)}`,
      );
      const result = await response.json();
      return `${result.presignedUrl}#toolbar=0&navpanes=0&view=Fit`;
    },
  });
  return (
    <div className="grid h-full w-full place-items-center bg-white">
      {isPending ? (
        <Loader2 className="size-12 animate-spin text-emerald-500" />
      ) : (
        <iframe src={data} className="h-full w-full" />
      )}
    </div>
  );
}

export default PDFViewer;

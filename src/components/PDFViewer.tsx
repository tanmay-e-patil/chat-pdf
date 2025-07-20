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
      return result.presignedUrl;
    },
  });
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {isPending ? (
        <Loader2 className="size-36 animate-spin" />
      ) : (
        <iframe src={data} className="w-full h-full"></iframe>
      )}
    </div>
  );
}

export default PDFViewer;

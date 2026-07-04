"use client";

import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent } from "../ui/card";
import {
  RenderEmptyState,
  RenderErrorState,
  RenderUploadedState,
  RenderUploadingState,
} from "./RenderState";

interface UploaderState {
  id: string | null;
  file: File | null;
  uploading: boolean;
  progress: number;
  key?: string;
  error: boolean;
  errorMessage?: string;
  objectUrl?: string;
}

export function Uploader() {
  const [fileState, setFileState] = useState<UploaderState>({
    error: false,
    file: null,
    id: null,
    uploading: false,
    progress: 0,
  });

  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_key, file_name }),
      });

      const resJson = await response.json();
      if (!response.ok) {
        toast.error(
          response.status === 403
            ? "Error creating chat: " + resJson.error
            : "Error creating chat",
        );
        return;
      }
      return resJson;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["chat"] });
      if (data?.chat_id) {
        await queryClient.invalidateQueries({ queryKey: ["chat", data.chat_id] });
      }
    },
  });

  function renderContent() {
    if (fileState.uploading && fileState.file) {
      return (
        <RenderUploadingState
          file={fileState.file}
          progress={fileState.progress}
        />
      );
    }
    if (fileState.error) {
      return <RenderErrorState message={fileState.errorMessage} />;
    }
    if (fileState.objectUrl) {
      return <RenderUploadedState />;
    }

    return <RenderEmptyState isDragActive={isDragActive} />;
  }

  async function uploadFile(file: File) {
    setFileState((prev) => ({
      ...prev,
      uploading: true,
      progress: 0,
    }));

    try {
      const presignedResponse = await fetch("/api/s3/presign/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          isPDF: true,
        }),
      });
      if (!presignedResponse.ok) {
        toast.error("Failed to get presigned URL");
        setFileState((prev) => ({
          ...prev,
          uploading: false,
          progress: 0,
          error: true,
          errorMessage: "We couldn't prepare that upload. Try again.",
        }));
        return;
      }

      const { presignedUrl, key } = await presignedResponse.json();
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentageCompleted = (event.loaded / event.total) * 100;
            setFileState((prev) => ({
              ...prev,
              progress: Math.round(percentageCompleted),
            }));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            setFileState((prev) => ({
              ...prev,
              uploading: false,
              progress: 100,
              key: key,
            }));

            toast.success("File uploaded successfully");
            mutate(
              { file_key: key, file_name: file.name },
              {
                onSuccess: (data) => {
                  if (data?.chat_id) router.push(`/chat/${data.chat_id}`);
                },
                onError: (e) => {
                  console.log(e);
                },
              },
            );
            resolve();
          } else {
            reject(new Error("Upload failed..."));
          }
        };
        xhr.onerror = () => {
          reject(new Error("Upload failed..."));
        };

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
      setFileState((prev) => ({
        ...prev,
        progress: 0,
        uploading: false,
        error: true,
        errorMessage: "The upload failed. Please retry with the same PDF.",
      }));
    }
  }

  useEffect(() => {
    return () => {
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);

  function rejectFile(rejections: FileRejection[]) {
    const code = rejections[0]?.errors[0]?.code;
    const errorMessage =
      code === "file-too-large"
        ? "That PDF is over 10MB. Choose a smaller file."
        : "Only PDF files can be uploaded here.";

    setFileState({
      file: null,
      uploading: false,
      progress: 0,
      error: true,
      errorMessage,
      id: uuidv4(),
    });
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: rejectFile,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileState({
        file: file,
        uploading: false,
        progress: 0,
        objectUrl: URL.createObjectURL(file),
        error: false,
        id: uuidv4(),
      });

      uploadFile(file);
    },
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "group relative h-[30rem] w-full cursor-pointer overflow-hidden rounded-[2rem] border-2 border-dashed bg-slate-950/70 shadow-2xl shadow-black/20 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
        isDragActive
          ? "scale-[1.01] border-emerald-300 bg-emerald-300/10"
          : "border-white/15 hover:border-emerald-300/50 hover:bg-slate-950/90",
      )}
    >
      <div className="pointer-events-none absolute inset-x-12 top-0 h-24 bg-emerald-400/10 blur-3xl transition group-hover:bg-emerald-400/20" />
      <CardContent className="relative flex h-full w-full cursor-pointer items-center justify-center p-6 md:p-8">
        <input {...getInputProps()} />
        {renderContent()}
      </CardContent>
    </Card>
  );
}

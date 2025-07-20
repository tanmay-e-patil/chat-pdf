"use client";

import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";
import {
  RenderEmptyState,
  RenderErrorState,
  RenderUploadedState,
  RenderUploadingState,
} from "./RenderState";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

interface UploaderState {
  id: string | null;
  file: File | null;
  uploading: boolean;
  progress: number;
  key?: string;
  error: boolean;
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
        if (response.status === 403) {
          toast.error("Error creating chat: " + resJson.error);
        } else {
          toast.error("Error creating chat");
        }
        return;
      }
      return resJson;
    },
  });

  function renderContent() {
    if (fileState.uploading) {
      return (
        <RenderUploadingState
          file={fileState.file as File}
          progress={fileState.progress}
        />
      );
    }
    if (fileState.error) {
      return <RenderErrorState />;
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
                  router.push(`/chat/${data.chat_id}`);
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
      setFileState((prev) => ({
        ...prev,
        progress: 0,
        uploading: false,
        error: true,
      }));
      Sentry.captureException(error);
    }
  }

  useEffect(() => {
    return () => {
      if (fileState.objectUrl && !fileState.objectUrl.startsWith("http")) {
        URL.revokeObjectURL(fileState.objectUrl);
      }
    };
  }, [fileState.objectUrl]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];

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
        "relative cursor-pointer border-2 border-dashed transition-colors duration-200 ease-in-out w-full h-64",
        isDragActive
          ? "border-primary bg-primary/10 border-solid"
          : "border-border",
      )}
    >
      <CardContent className="flex cursor-pointer items-center justify-center w-full h-full p-4 ">
        <input {...getInputProps()} />
        {renderContent()}
      </CardContent>
    </Card>
  );
}

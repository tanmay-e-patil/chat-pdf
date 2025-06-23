"use client";
import { Inbox, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import React from "react";
import { useRouter } from "next/navigation";

const FileUpload = () => {
  const [uploading, setUploading] = React.useState(false);
  const router = useRouter();

  const { mutate, isPending } = useMutation({
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
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        return;
      }

      try {
        setUploading(true);
        const data = await uploadToS3(file);
        if (!data?.file_key || !data?.file_name) {
          toast.error("Error uploading file");
          return;
        }
        mutate(data, {
          onSuccess: (data) => {
            router.push(`/chat/${data.chat_id}`);
          },
          onError: (e) => {
            console.log(e);
          },
        });
      } catch (error) {
        console.error(error);
      }
      setUploading(false);
    },
  });
  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            "dropzone border-dashed border-2 h-72 border-gray-300 p-4 rounded-xl cursor-pointe flex flex-col items-center justify-center cursor-pointer",
        })}
      >
        <input {...getInputProps()} />
        {uploading || isPending ? (
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        ) : (
          <div className="flex flex-col justify-center items-center ">
            <Inbox className="size-10 text-purple-600" />
            <p className=" text-sm text-slate-400">Drop PDF Here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

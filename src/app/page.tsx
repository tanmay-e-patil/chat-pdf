import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, LogInIcon } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { checkSubscription } from "@/lib/subscriptions";
import SubscriptionButton from "@/components/SubscriptionButton";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { Uploader } from "@/components/file-uploader/Uploader";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  const isPro = await checkSubscription();
  let isUploadAllowed = true;

  let firstChat;
  if (userId) {
    firstChat = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .execute();
    if (firstChat) {
      firstChat = firstChat[0];
    }
    if (!isPro) {
      const numChats = await db
        .select({
          count: count(),
        })
        .from(chats)
        .where(eq(chats.userId, userId))
        .execute();
      if (numChats[0].count >= 1) {
        isUploadAllowed = false;
      }
    }
  }

  return (
    <div className="w-screen min-h-screen bg-gradient-to-r from-green-300 via-blue-100 to-purple-300">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-semibold">Chat with any pdf</h1>

            <UserButton afterSignOutUrl="/" />
          </div>
          <div className="flex mt-2">
            {isAuth && firstChat && (
              <Link href={`/chat/${firstChat.id}`}>
                <Button>
                  Go to Chats <ArrowRight className="ml-2"></ArrowRight>
                </Button>
              </Link>
            )}
            <div className="ml-3">
              {isAuth && <SubscriptionButton isPro={isPro} />}
            </div>
          </div>

          <p className="max-w-xl mt-1 text-lg text-slate-600">
            Join millions of students, researchers and professionals to answer
            questions and understand, research with AI{" "}
          </p>
          <div className="w-full mt-4">
            {isAuth ? (
              <div>
                {isUploadAllowed ? (
                  <div>
                    <Uploader />
                  </div>
                ) : (
                  <div>
                    <h1 className="bg-red-500 rounded-sm">
                      PDF limit exceeded. Please upgrade to pro
                    </h1>
                  </div>
                )}
              </div>
            ) : (
              // <div
              //   onClick={() => {
              //     if (!isUploadAllowed) {
              //       toast.error(
              //         "Error uploading pdf: PDF limit exceeded. Please upgrade to pro",
              //       );
              //     }
              //   }}
              // >
              //   <FileUpload></FileUpload>
              // </div>
              <div>
                <Link href="/sign-in">
                  <Button>
                    Login to get Started!
                    <LogInIcon className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link
                  href="https://github.com/tanmay-e-patil/chat-pdf"
                  target="_blank"
                >
                  <Button className="mt-2 mx-2">
                    View Source Code <ArrowRight className="ml-2"></ArrowRight>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

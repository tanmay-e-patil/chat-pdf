import { getAuthenticatedUserId, getOwnedChatByFileKey } from "@/lib/authz";
import { getS3PresignedUrl } from "@/lib/s3";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get("file_key");
    if (!fileKey) {
      return NextResponse.json(
        { error: "Missing or invalid object key" },
        { status: 400 },
      );
    }
    const chat = await getOwnedChatByFileKey(fileKey, userId);
    if (!chat) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const presignedUrl = await getS3PresignedUrl(fileKey);

    const response = {
      presignedUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Missing or invalid object key" },
      { status: 500 },
    );
  }
}

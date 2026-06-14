import { NextResponse } from "next/server";
import { createSignedUpload } from "@/lib/supabase/storage";
import { STORAGE_BUCKET } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns a server-minted storage path + signed-upload token. The client writes
// the cropped JPEG to the private bucket with uploadToSignedUrl(path, token).
export async function POST() {
  try {
    const { path, token } = await createSignedUpload();
    return NextResponse.json({ bucket: STORAGE_BUCKET, path, token });
  } catch (err) {
    console.error("/api/upload-url failed", err);
    return NextResponse.json(
      { error: "Could not create an upload URL. Please try again." },
      { status: 500 },
    );
  }
}

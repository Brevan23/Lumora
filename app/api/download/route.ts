import { NextResponse } from "next/server";
import { verifyDownloadToken } from "@/lib/auth";
import { getOrder } from "@/lib/orders";
import {
  createSignedStlDownload,
  createSignedPreviewDownload,
} from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tokenized download link used in the admin email — lives on the app's own
// domain and mints a fresh Supabase signed URL on each click, then redirects.
// So the link never expires or goes stale, and reads as the site's address.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const orderId = params.get("o") ?? "";
  const token = params.get("t") ?? "";
  const kind = params.get("kind") === "preview" ? "preview" : "stl";

  if (!verifyDownloadToken(orderId, token)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 401 });
  }

  try {
    const order = await getOrder(orderId);
    if (!order || !order.stl_path) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const signed =
      kind === "preview"
        ? await createSignedPreviewDownload(orderId)
        : await createSignedStlDownload(order.stl_path);
    return NextResponse.redirect(signed, 302);
  } catch (err) {
    console.error("/api/download failed", err);
    return NextResponse.json(
      { error: "Could not prepare the download" },
      { status: 500 },
    );
  }
}

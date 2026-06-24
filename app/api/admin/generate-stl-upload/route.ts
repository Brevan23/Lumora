import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { generateLithophane } from "@/lib/lithophane";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 144 × 108 mm frame, sized to the chosen orientation.
const DIMS = {
  portrait: { widthMm: 108, heightMm: 144 },
  landscape: { widthMm: 144, heightMm: 108 },
} as const;

/**
 * Ad-hoc STL generation from an uploaded image — no order required. Streams the
 * print-ready monochrome lithophane STL straight back as a download. Auth-gated
 * by the admin session cookie; needs no database/storage.
 */
export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!verifySessionCookieValue(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected an uploaded image (multipart form data)." },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image too large (max 20MB)." }, { status: 413 });
  }

  const orientation =
    form.get("orientation") === "landscape" ? "landscape" : "portrait";

  const raw = Buffer.from(await file.arrayBuffer());
  // The generator decodes JPEG only, so normalize any format (PNG, WebP, etc.)
  // to an upright JPEG first. EXIF rotation is applied (admin uploads aren't
  // cropped client-side); transparency flattens to white (= thin/clear).
  let buffer: Buffer;
  try {
    buffer = await sharp(raw)
      .rotate()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't read that image. Upload a JPG or PNG (HEIC isn't supported here; convert it to JPG first).",
      },
      { status: 400 },
    );
  }

  try {
    const { stl, report } = await generateLithophane(buffer, DIMS[orientation]);

    // Wrap in a Blob (clean BodyInit; sets Content-Type + Content-Length).
    const blob = new Blob([new Uint8Array(stl)], { type: "model/stl" });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="lithophane-${orientation}.stl"`,
        // URI-encoded so warning text with non-ASCII (≥, —) is a valid header.
        "X-Litho-Warnings": encodeURIComponent(report.warnings.join(" | ")),
      },
    });
  } catch (err) {
    console.error("/api/admin/generate-stl-upload failed", err);
    const message =
      err instanceof Error ? err.message : "Could not generate the STL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { generateColorLithophane } from "@/lib/lithophane/color";
import { COLOR_DIMS } from "@/lib/lithophane/color/params";
import { makeZip } from "@/lib/lithophane/color/threemf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PRINTING = `Illuminate Memories — Colour Lithophane (CMYK)

This pack prints one full-colour lithophane sized to the 144 x 108 mm frame.
It uses a fine white luminance relief (the detail) over a thin Cyan/Magenta/
Yellow colour layer (the hue), on a white base — the same idea as Lithophane
Maker.

HOW TO PRINT (Bambu AMS):
  1. Open  color-lithophane.3mf  in Bambu Studio (or OrcaSlicer).
  2. You'll see 4 parts, tinted White / Cyan / Magenta / Yellow. Keep them
     stacked — do NOT merge them into one part.
  3. Assign each part to its AMS slot: Warm White, Cyan, Magenta, Yellow.
  4. Slice at a 0.10 mm layer height (must match how this was generated),
     leave the prime/purge tower on, and print. The white side faces the light.

preview.png shows the approximate lit result. Colours are "good out of the
box"; for a closer match we can tune to your filaments + LED.
`;

/**
 * Ad-hoc colour-lithophane generation from an uploaded image — no order
 * required. Returns a small ZIP: the multi-material 3MF (all 4 colour parts),
 * a predicted-lit preview, and printing instructions. (The 3MF is the deliverable;
 * the per-colour STLs are intentionally not bundled — they're ~110 MB and the 3MF
 * already contains every part.) Auth-gated by the admin session cookie.
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { threemf, previewPng } = generateColorLithophane(
      buffer,
      COLOR_DIMS[orientation],
    );

    const zip = makeZip([
      { name: "color-lithophane.3mf", data: threemf },
      { name: "preview.png", data: previewPng },
      { name: "PRINTING.txt", data: Buffer.from(PRINTING, "utf8") },
    ]);

    const blob = new Blob([new Uint8Array(zip)], { type: "application/zip" });
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="color-lithophane-${orientation}.zip"`,
      },
    });
  } catch (err) {
    console.error("/api/admin/generate-color-upload failed", err);
    const message =
      err instanceof Error ? err.message : "Could not generate the colour file.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

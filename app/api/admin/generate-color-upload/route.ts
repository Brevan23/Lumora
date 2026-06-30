import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { generateColorLithophane } from "@/lib/lithophane/color";
import { COLOR_DIMS } from "@/lib/lithophane/color/params";
import { makeZip, type ZipEntry } from "@/lib/lithophane/color/threemf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Keep the response under the serverless body limit. If including the 3MF would
// push past this, ship just the STLs (the user's chosen workflow).
const ZIP_LIMIT_BYTES = 47 * 1024 * 1024;

const PRINTING = `Illuminate Memories — Colour Lithophane (CMYK)

Five STL parts, sized to the 144 x 108 mm frame. Detail comes from the fine
white relief (top_white.stl); hue from the thin Cyan/Magenta/Yellow layers; all
on a flat white base (white.stl).

HOW TO PRINT (Bambu AMS):
  1. Import all five STLs together. They're pre-aligned to the same spot —
     keep them there; do NOT move or merge them.
  2. Assign each part to a filament BY ITS FILENAME:
       white.stl      ->  Warm White
       top_white.stl  ->  Warm White   (the SAME white filament as white.stl)
       cyan.stl       ->  Cyan
       magenta.stl    ->  Magenta
       yellow.stl     ->  Yellow
  3. Slice at 0.10 mm layer height, leave the prime/purge tower on, and print.
     The white side faces the backlight.

ALTERNATIVE: if color-lithophane.3mf is included, it's the same model as a
single file — open it and assign its 4 parts (White / Cyan / Magenta / Yellow).

preview.png shows the approximate lit result. Colours are "good out of the box";
we can fine-tune to your filaments + LED later.
`;

/**
 * Ad-hoc colour-lithophane generation from an uploaded image — no order
 * required. Returns a ZIP of the five per-part STLs (+ preview + instructions),
 * and the single-file 3MF too when it fits under the response limit.
 * Auth-gated by the admin session cookie.
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
    const { threemf, stls, previewPng } = generateColorLithophane(
      buffer,
      COLOR_DIMS[orientation],
    );

    const stlEntries: ZipEntry[] = [
      { name: "white.stl", data: stls.white },
      { name: "top_white.stl", data: stls.topWhite },
      { name: "cyan.stl", data: stls.cyan },
      { name: "magenta.stl", data: stls.magenta },
      { name: "yellow.stl", data: stls.yellow },
      { name: "preview.png", data: previewPng },
      { name: "PRINTING.txt", data: Buffer.from(PRINTING, "utf8") },
    ];

    // Prefer including the single-file 3MF; drop it if that blows the limit.
    let zip = makeZip([{ name: "color-lithophane.3mf", data: threemf }, ...stlEntries]);
    if (zip.length > ZIP_LIMIT_BYTES) {
      zip = makeZip(stlEntries);
    }

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

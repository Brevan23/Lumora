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

This pack contains everything to print one full-colour lithophane sized to the
144 x 108 mm frame.

EASIEST (Bambu AMS):
  1. Open  color-lithophane.3mf  in Bambu Studio (or OrcaSlicer).
  2. You'll see 4 parts, tinted White / Cyan / Magenta / Yellow.
  3. Assign each to its AMS slot: Warm White, Cyan, Magenta, Yellow.
  4. Slice with a 0.10 mm layer height (it must match how this was generated),
     enable a prime/purge tower, and print. The white side faces the backlight.

MANUAL / OTHER SLICERS:
  Import the four STLs (white.stl, cyan.stl, magenta.stl, yellow.stl) onto the
  same spot and assign one filament per object.

preview.png shows the approximate lit result. Colours are "good out of the box";
for a closer match we can tune to your filaments + LED with one test sheet.
`;

/**
 * Ad-hoc colour-lithophane generation from an uploaded image — no order
 * required. Returns a ZIP (3MF + per-colour STLs + preview + instructions).
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

    const zip = makeZip([
      { name: "color-lithophane.3mf", data: threemf },
      { name: "white.stl", data: stls.white },
      { name: "cyan.stl", data: stls.cyan },
      { name: "magenta.stl", data: stls.magenta },
      { name: "yellow.stl", data: stls.yellow },
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

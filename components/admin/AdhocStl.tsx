"use client";
import { useRef, useState } from "react";
import { SpinnerIcon, UploadIcon } from "@/components/site/icons";

type Orientation = "portrait" | "landscape";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Convert any browser-decodable image (or HEIC) to a JPEG blob; the server
 *  generator decodes JPEG only. Mirrors the customer uploader. */
async function toJpegBlob(file: File): Promise<Blob> {
  let workable: Blob = file;
  const name = file.name.toLowerCase();
  const isHeic =
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif";
  if (isHeic) {
    const heic2any = (await import("heic2any")).default as (opts: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    workable = Array.isArray(out) ? out[0] : out;
  }
  const url = URL.createObjectURL(workable);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
        "image/jpeg",
        0.92,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Admin-only tool: upload any JPG/PNG and download a monochrome lithophane STL
 * (144 × 108 mm, portrait or landscape). Works with no order and no database —
 * the server route generates and streams the STL straight back.
 */
export function AdhocStl() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);

  async function generate() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setWarnings([]);
    setDone(null);
    try {
      const jpeg = await toJpegBlob(file);
      const form = new FormData();
      form.append("image", jpeg, "upload.jpg");
      form.append("orientation", orientation);

      const res = await fetch("/api/admin/generate-stl-upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Generation failed.");
      }

      const raw = res.headers.get("X-Litho-Warnings");
      if (raw) setWarnings(decodeURIComponent(raw).split(" | ").filter(Boolean));

      const blob = await res.blob();
      const filename = `lithophane-${orientation}.stl`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-line bg-white p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold">
        Generate an STL from any photo
      </h2>
      <p className="mt-1 text-sm text-muted">
        Monochrome (single-colour) lithophane at 144 × 108 mm. No order needed.
        Upload a JPG, PNG, or iPhone HEIC and the print-ready STL downloads automatically.
        (This is the monochrome generator, separate from the CMYK colour
        workflow.)
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setDone(null);
          setError(null);
        }}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium transition-colors hover:border-ink/40"
        >
          <UploadIcon width={16} height={16} />
          {file ? "Change photo" : "Choose photo"}
        </button>
        {file ? <span className="text-sm text-muted">{file.name}</span> : null}
      </div>

      <div
        className="mt-4 inline-flex rounded-full border border-line bg-white p-1 text-sm"
        role="group"
        aria-label="Orientation"
      >
        <button
          type="button"
          onClick={() => setOrientation("portrait")}
          aria-pressed={orientation === "portrait"}
          className={`rounded-full px-4 py-1 font-medium transition-colors ${
            orientation === "portrait"
              ? "bg-amber-deep text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Portrait
        </button>
        <button
          type="button"
          onClick={() => setOrientation("landscape")}
          aria-pressed={orientation === "landscape"}
          className={`rounded-full px-4 py-1 font-medium transition-colors ${
            orientation === "landscape"
              ? "bg-amber-deep text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Landscape
        </button>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={generate}
          disabled={!file || loading}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <SpinnerIcon width={18} height={18} /> : null}
          {loading ? "Generating STL…" : "Generate STL"}
        </button>
      </div>

      {done ? (
        <p className="mt-3 text-sm text-green-700">✓ Downloaded {done}</p>
      ) : null}
      {warnings.map((w, i) => (
        <p key={i} className="mt-2 text-sm text-amber-deep">
          ⚠ {w}
        </p>
      ))}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

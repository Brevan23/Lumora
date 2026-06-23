"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpinnerIcon } from "@/components/site/icons";

export function StlButton({
  orderId,
  stlUrl,
  previewUrl,
}: {
  orderId: string;
  stlUrl: string | null;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(stlUrl);
  const [preview, setPreview] = useState<string | null>(previewUrl);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  async function generate() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/generate-stl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error("generate failed");
      const data = (await res.json()) as {
        url?: string;
        previewUrl?: string;
        report?: { warnings?: string[] };
      };
      if (data.url) setUrl(data.url);
      if (data.previewUrl) setPreview(data.previewUrl);
      setWarnings(data.report?.warnings ?? []);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {url ? (
        <a
          href={url}
          download
          className="text-xs font-medium text-amber-deep hover:underline"
        >
          Download STL
        </a>
      ) : null}
      {preview ? (
        <a
          href={preview}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted hover:underline"
        >
          Preview heightmap
        </a>
      ) : null}
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-ink/40 disabled:opacity-50"
      >
        {loading ? <SpinnerIcon width={14} height={14} /> : null}
        {loading ? "Generating…" : url ? "Regenerate" : "Generate STL"}
      </button>
      {warnings.map((w, i) => (
        <span key={i} className="text-xs text-amber-deep">
          ⚠ {w}
        </span>
      ))}
      {failed ? (
        <span className="text-xs text-red-700">Failed. Try again</span>
      ) : null}
    </div>
  );
}

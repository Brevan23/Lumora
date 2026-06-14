"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpinnerIcon } from "@/components/site/icons";

export function FulfillButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function fulfill() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin/fulfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) throw new Error("fulfill failed");
      router.refresh();
    } catch {
      setFailed(true);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={fulfill}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-ink/40 disabled:opacity-50"
      >
        {loading ? <SpinnerIcon width={14} height={14} /> : null}
        Mark fulfilled
      </button>
      {failed ? <span className="text-xs text-red-700">Try again</span> : null}
    </div>
  );
}

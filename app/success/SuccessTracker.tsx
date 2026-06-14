"use client";
import { useEffect } from "react";
import { trackPurchase } from "@/components/MetaPixel";

/**
 * Fires the Meta Pixel Purchase event once per session_id. A sessionStorage
 * guard + the Pixel eventID (the session id) prevent double-counting on
 * refresh/bookmark.
 */
export function SuccessTracker({ sessionId }: { sessionId: string | null }) {
  useEffect(() => {
    if (!sessionId) return;
    const key = `lumora_purchase_${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — the Pixel eventID still dedupes server-side.
    }
    trackPurchase(sessionId);
  }, [sessionId]);

  return null;
}

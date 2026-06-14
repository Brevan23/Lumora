"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client using the PUBLIC anon key. Used only to upload the
// cropped photo via uploadToSignedUrl (the token authorizes the write — no
// session needed). Constructed lazily so static prerender of `/` never calls
// createClient with empty build-time env.
let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
  return cached;
}

import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

// Lazily-constructed Stripe client. The API version is pinned by the installed
// `stripe` package (locked in package-lock.json), giving deterministic behavior
// without fighting the SDK's literal-union apiVersion type.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  return cached;
}

import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { requireEnv } from "@/lib/env";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

/**
 * Constant-time password check: compare equal-length SHA-256 digests of the
 * submitted value and ADMIN_PASSWORD. No early-exit `===` (no length/prefix
 * timing leak). Throws if ADMIN_PASSWORD is unset (fail closed).
 */
export function verifyPassword(input: string): boolean {
  const expected = requireEnv("ADMIN_PASSWORD");
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function sign(payload: string): string {
  // Throws if ADMIN_SESSION_SECRET is unset (fail closed — no admin login).
  return createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET"))
    .update(payload)
    .digest("hex");
}

/** Cookie value: `<expiresAtSeconds>.<hmac>`. */
export function createSessionCookieValue(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);

  let expectedSig: string;
  try {
    expectedSig = sign(payload);
  } catch {
    return false; // secret missing => deny
  }

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > Math.floor(Date.now() / 1000);
}

/**
 * Capability token for an order's download links (emailed to the admin). An
 * attacker can't forge it without ADMIN_SESSION_SECRET, so the link is safe to
 * put in an email without a login.
 */
export function signDownloadToken(orderId: string): string {
  return createHmac("sha256", requireEnv("ADMIN_SESSION_SECRET"))
    .update(`download:${orderId}`)
    .digest("hex");
}

export function verifyDownloadToken(orderId: string, token: string): boolean {
  if (!orderId || !token) return false;
  let expected: string;
  try {
    expected = signDownloadToken(orderId);
  } catch {
    return false;
  }
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

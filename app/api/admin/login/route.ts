import { NextResponse } from "next/server";
import { verifyPassword, createSessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? (body as { password: string }).password
      : "";

  try {
    if (!verifyPassword(password)) {
      // Small fixed delay to blunt rapid guessing.
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
  } catch (err) {
    // ADMIN_PASSWORD / ADMIN_SESSION_SECRET not configured -> fail closed.
    console.error("Admin login misconfigured", err);
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

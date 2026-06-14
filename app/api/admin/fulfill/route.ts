import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { markOrderFulfilled } from "@/lib/orders";
import { SESSION_COOKIE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!verifySessionCookieValue(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId =
    typeof (body as { orderId?: unknown })?.orderId === "string"
      ? (body as { orderId: string }).orderId
      : "";
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  try {
    await markOrderFulfilled(orderId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/admin/fulfill failed", err);
    return NextResponse.json(
      { error: "Could not update order" },
      { status: 500 },
    );
  }
}

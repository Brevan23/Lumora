import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { getOrder, setOrderStlPath } from "@/lib/orders";
import {
  downloadPhoto,
  uploadStl,
  createSignedStlDownload,
} from "@/lib/supabase/storage";
import { generateLithophaneStl } from "@/lib/lithophane";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status === "pending") {
      return NextResponse.json({ error: "Order is not paid" }, { status: 409 });
    }

    const photo = await downloadPhoto(order.photo_path);
    const stl = await generateLithophaneStl(photo);
    const path = await uploadStl(orderId, stl);
    await setOrderStlPath(orderId, path);
    const url = await createSignedStlDownload(path);

    return NextResponse.json({ ok: true, url, bytes: stl.length });
  } catch (err) {
    console.error("/api/admin/generate-stl failed", err);
    return NextResponse.json(
      { error: "Could not generate the STL. Please try again." },
      { status: 500 },
    );
  }
}

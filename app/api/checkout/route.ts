import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createPendingOrder, setOrderSessionId } from "@/lib/orders";
import { requireEnv } from "@/lib/env";
import {
  PHOTO_PATH_REGEX,
  PRODUCT_NAME,
  PRICE_CENTS,
  CURRENCY,
  DEFAULT_ORIENTATION,
} from "@/lib/constants";
import type { Orientation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const photoPath =
    typeof (body as { photoPath?: unknown })?.photoPath === "string"
      ? (body as { photoPath: string }).photoPath
      : "";

  // Reject any path the server did not mint (validation, not interpolation).
  if (!PHOTO_PATH_REGEX.test(photoPath)) {
    return NextResponse.json({ error: "Invalid photo reference" }, { status: 400 });
  }

  const rawOrientation = (body as { orientation?: unknown })?.orientation;
  const orientation: Orientation =
    rawOrientation === "portrait" || rawOrientation === "landscape"
      ? rawOrientation
      : DEFAULT_ORIENTATION;

  try {
    const baseUrl = requireEnv("APP_BASE_URL");
    const orderId = await createPendingOrder(photoPath, orientation);

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: { name: PRODUCT_NAME },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["CA"] },
      metadata: { order_id: orderId },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
    });

    // Persist the session id so the column/index are populated for reconciliation.
    await setOrderSessionId(orderId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("/api/checkout failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}

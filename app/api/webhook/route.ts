import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import {
  markOrderPaid,
  getOrder,
  markCustomerEmailSent,
  markAdminEmailSent,
} from "@/lib/orders";
import { generateAndStore } from "@/lib/stl-job";
import {
  createSignedStlDownload,
  createSignedPreviewDownload,
} from "@/lib/supabase/storage";
import { EMAIL_LINK_TTL_SECONDS } from "@/lib/constants";
import { sendCustomerEmail, sendAdminEmail } from "@/lib/email";
import type { ShippingAddress } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function extractShipping(session: Stripe.Checkout.Session): {
  name: string | null;
  address: ShippingAddress | null;
} {
  // Stripe API >= 2025-03-31 nests shipping under collected_information; older
  // versions expose it at the top level. Read defensively across both shapes.
  const s = session as unknown as {
    collected_information?: { shipping_details?: { name?: string; address?: Record<string, string | null> } };
    shipping_details?: { name?: string; address?: Record<string, string | null> };
  };
  const details = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const a = details?.address ?? null;
  const address: ShippingAddress | null = a
    ? {
        line1: a.line1 ?? null,
        line2: a.line2 ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        postal_code: a.postal_code ?? null,
        country: a.country ?? null,
      }
    : null;
  return { name: details?.name ?? null, address };
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // 'completed' is not 'paid' for delayed methods — guard explicitly.
      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const orderId = session.metadata?.order_id;
      if (!orderId) {
        console.error("checkout.session.completed missing order_id", session.id);
        return NextResponse.json({ received: true });
      }

      const shipping = extractShipping(session);

      // (1) Atomic guarded paid-transition (idempotent on duplicate deliveries).
      await markOrderPaid(orderId, {
        customer_email: session.customer_details?.email ?? null,
        shipping_name: shipping.name,
        shipping_address: shipping.address,
        amount_total: session.amount_total ?? null,
        currency: session.currency ?? null,
      });

      // (2) Auto-generate the print-ready STL on payment (idempotent: skip if
      // already generated). Best-effort: a generation hiccup never blocks the
      // paid order or its emails — the admin can regenerate from /admin.
      let order = await getOrder(orderId);
      if (order && !order.stl_path) {
        try {
          await generateAndStore(order);
          order = await getOrder(orderId);
        } catch (genErr) {
          console.error(`Auto STL generation failed for ${orderId}`, genErr);
        }
      }

      // (3) Send each email at most once, guarded by its OWN flag. The admin
      // email carries a 7-day download link to the STL when available. If a send
      // throws, the handler returns 5xx and Stripe retries — re-sending only the
      // email not yet marked. Skipped entirely if Resend isn't configured.
      if (order && process.env.RESEND_API_KEY) {
        let stlUrl: string | undefined;
        let previewUrl: string | undefined;
        if (order.stl_path) {
          stlUrl = await createSignedStlDownload(order.stl_path, EMAIL_LINK_TTL_SECONDS).catch(() => undefined);
          previewUrl = await createSignedPreviewDownload(order.id, EMAIL_LINK_TTL_SECONDS).catch(() => undefined);
        }
        if (order.customer_email && !order.customer_email_sent_at) {
          await sendCustomerEmail(order); // throws -> 5xx -> Stripe retries
          await markCustomerEmailSent(order.id);
        }
        if (!order.admin_email_sent_at) {
          await sendAdminEmail(order, { stlUrl, previewUrl });
          await markAdminEmailSent(order.id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Non-2xx so Stripe retries; the guarded update + emails_sent_at make the
    // retry safe (no double flip, no double send).
    console.error("Webhook processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

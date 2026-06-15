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
import { sendCustomerEmail, sendAdminEmail } from "@/lib/email";
import type { ShippingAddress } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

      // (2) Send each email at most once, guarded by its OWN flag. If one send
      // throws, the handler returns 5xx and Stripe retries — re-sending only the
      // email that hasn't been marked, never the one already delivered. Emails
      // are skipped if Resend isn't configured, so a missing email provider
      // never fails the (already-recorded) paid webhook.
      const order = await getOrder(orderId);
      if (order && process.env.RESEND_API_KEY) {
        if (order.customer_email && !order.customer_email_sent_at) {
          await sendCustomerEmail(order); // throws -> 5xx -> Stripe retries
          await markCustomerEmailSent(orderId);
        }
        if (!order.admin_email_sent_at) {
          await sendAdminEmail(order);
          await markAdminEmailSent(orderId);
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

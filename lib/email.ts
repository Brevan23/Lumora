import "server-only";
import { Resend } from "resend";
import { requireEnv, getEnv } from "@/lib/env";
import { formatMoney, formatAddressLines } from "./format";
import { BRAND, PRODUCTION_DAYS } from "./constants";
import type { Order } from "./types";

let cached: Resend | null = null;
function getResend(): Resend {
  if (cached) return cached;
  cached = new Resend(requireEnv("RESEND_API_KEY"));
  return cached;
}

// Defaults to Resend's shared sender, which works without domain verification.
// Any custom/unverified domain in EMAIL_FROM is rejected by Resend with a 403.
function fromAddress(): string {
  return getEnv("EMAIL_FROM") || "onboarding@resend.dev";
}

function orderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

const INK = "#1E1B16";
const AMBER = "#E0A140";
const IVORY = "#FBF7F0";
const MUTED = "#6B6256";

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:${IVORY};padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr><td style="padding-bottom:24px;">
      <span style="font-size:22px;font-weight:700;letter-spacing:0.02em;color:${INK};">${BRAND}</span>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #ECE3D4;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:${INK};">${title}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding-top:24px;font-size:12px;color:${MUTED};text-align:center;">
      ${BRAND} · Made in Canada
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${AMBER};color:${INK};text-decoration:none;font-weight:600;padding:12px 20px;border-radius:999px;">${label}</a>`;
}

/** Customer confirmation. Throws on Resend error so the webhook returns 5xx and Stripe retries. */
export async function sendCustomerEmail(order: Order): Promise<void> {
  if (!order.customer_email) return; // no recipient; don't block the paid flow
  const amount =
    order.amount_total != null
      ? formatMoney(order.amount_total, order.currency ?? "cad")
      : "";
  const body = `
    <p style="margin:0 0 16px;line-height:1.6;">Thank you. Your payment was received and your custom photo lithophane is on its way into production.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;color:${INK};">
      <tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Order</td><td><strong>#${orderRef(order.id)}</strong></td></tr>
      ${amount ? `<tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Total paid</td><td><strong>${amount}</strong></td></tr>` : ""}
    </table>
    <p style="margin:0 0 8px;font-weight:600;">What happens next</p>
    <p style="margin:0 0 16px;line-height:1.6;color:${MUTED};">We hand-craft your lithophane and ship it within an estimated ${PRODUCTION_DAYS} business days. Shipping is free across Canada, and you'll receive your glowing keepsake ready to display.</p>
    <p style="margin:0;line-height:1.6;">With warmth,<br/>The ${BRAND} team</p>`;
  const { error } = await getResend().emails.send(
    {
      from: fromAddress(),
      to: order.customer_email,
      subject: `Your ${BRAND} order #${orderRef(order.id)} is confirmed`,
      html: shell("Your order is confirmed", body),
    },
    { idempotencyKey: `order-${order.id}-customer` },
  );
  if (error) throw new Error(`Resend customer email failed: ${error.message}`);
}

/**
 * Admin new-order alert. When `links.stlUrl` is supplied, includes a prominent
 * download button for the print-ready STL (the file is too large to attach).
 * Throws on Resend error.
 */
export async function sendAdminEmail(
  order: Order,
  links?: { stlUrl?: string; previewUrl?: string },
): Promise<void> {
  const to = requireEnv("ADMIN_EMAIL");
  const adminUrl = `${requireEnv("APP_BASE_URL")}/admin`;
  const amount =
    order.amount_total != null
      ? formatMoney(order.amount_total, order.currency ?? "cad")
      : "";
  const addressLines = formatAddressLines(order.shipping_address);
  const stlBlock = links?.stlUrl
    ? `<div style="margin:4px 0 8px;">${button(links.stlUrl, "⬇  Download print-ready STL")}</div>
       ${links.previewUrl ? `<p style="margin:0 0 4px;"><a href="${links.previewUrl}" style="color:${MUTED};font-size:13px;">Preview heightmap (white = thick)</a></p>` : ""}
       <p style="margin:0 0 18px;font-size:12px;color:${MUTED};">This download link works for 7 days; the file is also in your admin.</p>`
    : "";
  const body = `
    <p style="margin:0 0 16px;line-height:1.6;">A new paid order is ready to fulfill${links?.stlUrl ? ". Your print-ready STL is below." : "."}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;color:${INK};">
      <tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Order</td><td><strong>#${orderRef(order.id)}</strong> <span style="color:${MUTED};">(${order.id})</span></td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Name</td><td>${order.shipping_name ?? "-"}</td></tr>
      <tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Email</td><td>${order.customer_email ?? "-"}</td></tr>
      ${amount ? `<tr><td style="padding:4px 16px 4px 0;color:${MUTED};">Total</td><td>${amount}</td></tr>` : ""}
      <tr><td style="padding:4px 16px 4px 0;color:${MUTED};vertical-align:top;">Ship to</td><td>${addressLines.length ? addressLines.join("<br/>") : "-"}</td></tr>
    </table>
    ${stlBlock}
    ${button(adminUrl, "Open admin →")}`;
  const { error } = await getResend().emails.send(
    {
      from: fromAddress(),
      to,
      subject: `New ${BRAND} order #${orderRef(order.id)}`,
      html: shell("New order", body),
    },
    { idempotencyKey: `order-${order.id}-admin` },
  );
  if (error) throw new Error(`Resend admin email failed: ${error.message}`);
}

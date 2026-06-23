import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import type { Order, ShippingAddress, Orientation } from "./types";

const TABLE = "orders";

export async function createPendingOrder(
  photoPath: string,
  orientation: Orientation,
): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({ photo_path: photoPath, status: "pending", orientation })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to create order");
  return data.id as string;
}

export async function setOrderSessionId(
  orderId: string,
  sessionId: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ stripe_session_id: sessionId })
    .eq("id", orderId);
  if (error) throw error;
}

export interface PaidFields {
  customer_email: string | null;
  shipping_name: string | null;
  shipping_address: ShippingAddress | null;
  amount_total: number | null;
  currency: string | null;
}

/**
 * Atomic guarded paid-transition. Updates only when the row is still 'pending',
 * so duplicate/retried webhook deliveries flip the status at most once.
 * Returns the row if THIS call performed the transition, else null.
 */
export async function markOrderPaid(
  orderId: string,
  fields: PaidFields,
): Promise<Order | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ status: "paid", ...fields })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*");
  if (error) throw error;
  return data && data.length ? (data[0] as Order) : null;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return (data as Order) ?? null;
}

/**
 * Mark the customer confirmation as sent (guarded on IS NULL). Set only after
 * that send succeeds, so a failure leaves it null and the Stripe retry re-sends
 * — independently of the admin email.
 */
export async function markCustomerEmailSent(orderId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ customer_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("customer_email_sent_at", null);
  if (error) throw error;
}

/** Mark the admin alert as sent (guarded on IS NULL), independent of the customer email. */
export async function markAdminEmailSent(orderId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ admin_email_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("admin_email_sent_at", null);
  if (error) throw error;
}

/** Admin list: paid + fulfilled orders, newest first. */
export async function listOrders(): Promise<Order[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("*")
    .in("status", ["paid", "fulfilled"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function markOrderFulfilled(orderId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ status: "fulfilled" })
    .eq("id", orderId)
    .eq("status", "paid");
  if (error) throw error;
}

export async function setOrderStlPath(
  orderId: string,
  path: string,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TABLE)
    .update({ stl_path: path })
    .eq("id", orderId);
  if (error) throw error;
}

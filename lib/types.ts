export type OrderStatus = "pending" | "paid" | "fulfilled";

/** Stripe address object shape (collected via Checkout shipping address). */
export interface ShippingAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  photo_path: string;
  stripe_session_id: string | null;
  customer_email: string | null;
  shipping_name: string | null;
  shipping_address: ShippingAddress | null;
  amount_total: number | null;
  currency: string | null;
  customer_email_sent_at: string | null;
  admin_email_sent_at: string | null;
}

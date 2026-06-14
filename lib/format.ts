import type { ShippingAddress } from "./types";

export function formatMoney(cents: number, currency = "cad"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function formatAddressLines(addr: ShippingAddress | null): string[] {
  if (!addr) return [];
  const lines: string[] = [];
  if (addr.line1) lines.push(addr.line1);
  if (addr.line2) lines.push(addr.line2);
  const cityLine = [addr.city, addr.state, addr.postal_code]
    .filter(Boolean)
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (addr.country) lines.push(addr.country);
  return lines;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

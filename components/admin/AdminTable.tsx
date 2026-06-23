import { formatMoney, formatAddressLines, formatDate } from "@/lib/format";
import type { Order } from "@/lib/types";
import { BRAND } from "@/lib/constants";
import { FulfillButton } from "./FulfillButton";
import { StlButton } from "./StlButton";

export interface AdminRow {
  order: Order;
  downloadUrl: string | null;
  stlUrl: string | null;
  previewUrl: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-amber/15 text-amber-deep",
  fulfilled: "bg-green-100 text-green-700",
  pending: "bg-sand text-muted",
};

export function AdminTable({ rows }: { rows: AdminRow[] }) {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-line bg-white">
        <div className="container-content flex h-16 items-center justify-between">
          <span className="font-display text-xl font-semibold">
            {BRAND} <span className="text-muted">· Orders</span>
          </span>
          <span className="text-sm text-muted">
            {rows.length} order{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <main className="container-content py-10">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-line bg-white p-10 text-center text-muted">
            No paid orders yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Ship to</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Orientation</th>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">STL</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ order, downloadUrl, stlUrl, previewUrl }) => {
                  const lines = formatAddressLines(order.shipping_address);
                  return (
                    <tr key={order.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 text-muted">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            STATUS_STYLES[order.status] ?? ""
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">{order.customer_email ?? "—"}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {order.shipping_name ?? "—"}
                        </div>
                        {lines.length ? (
                          <div className="text-muted">
                            {lines.map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {order.amount_total != null
                          ? formatMoney(order.amount_total, order.currency ?? "cad")
                          : "—"}
                      </td>
                      <td className="px-4 py-4 capitalize">
                        {order.orientation ?? "portrait"}
                      </td>
                      <td className="px-4 py-4">
                        {downloadUrl ? (
                          <div className="flex flex-col items-start gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={downloadUrl}
                              alt={`Order ${order.id} photo`}
                              className={`${order.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]"} w-16 rounded-lg object-cover`}
                            />
                            <a
                              href={downloadUrl}
                              download
                              className="text-xs font-medium text-amber-deep hover:underline"
                            >
                              Download photo
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted">unavailable</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StlButton
                          orderId={order.id}
                          stlUrl={stlUrl}
                          previewUrl={previewUrl}
                        />
                      </td>
                      <td className="px-4 py-4">
                        {order.status === "paid" ? (
                          <FulfillButton orderId={order.id} />
                        ) : (
                          <span className="text-xs font-medium text-green-700">
                            Fulfilled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

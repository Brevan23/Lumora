import { cookies } from "next/headers";
import { verifySessionCookieValue } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/constants";
import { listOrders } from "@/lib/orders";
import {
  createSignedDownload,
  createSignedStlDownload,
  createSignedPreviewDownload,
} from "@/lib/supabase/storage";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminTable, type AdminRow } from "@/components/admin/AdminTable";

// Never cached; the session cookie is verified server-side before any order
// data or signed download URL is produced.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!verifySessionCookieValue(token)) {
    return <LoginForm />;
  }

  const orders = await listOrders();
  const rows: AdminRow[] = await Promise.all(
    orders.map(async (order) => ({
      order,
      downloadUrl: await createSignedDownload(order.photo_path).catch(
        () => null,
      ),
      stlUrl: order.stl_path
        ? await createSignedStlDownload(order.stl_path).catch(() => null)
        : null,
      previewUrl: order.stl_path
        ? await createSignedPreviewDownload(order.id).catch(() => null)
        : null,
    })),
  );

  return <AdminTable rows={rows} />;
}

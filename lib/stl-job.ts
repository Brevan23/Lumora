import "server-only";
import type { Order } from "./types";
import { generateLithophane } from "./lithophane";
import type { ValidationReport } from "./lithophane/validate";
import { setOrderStlPath } from "./orders";
import {
  downloadPhoto,
  uploadStl,
  uploadPreview,
  uploadParamsRecord,
} from "./supabase/storage";

/**
 * Generate the print-ready lithophane for an order and persist all artifacts:
 * STL, preview heightmap, and parameter record. Shared by the admin on-demand
 * route and the payment webhook (auto-generate on paid). Throws on validation
 * failure.
 */
export async function generateAndStore(
  order: Order,
): Promise<{ stlPath: string; bytes: number; report: ValidationReport }> {
  const photo = await downloadPhoto(order.photo_path);
  const { stl, previewPng, report, params } = await generateLithophane(photo);

  const stlPath = await uploadStl(order.id, stl);
  await uploadPreview(order.id, previewPng);
  await uploadParamsRecord(order.id, {
    orderId: order.id,
    generatedAt: new Date().toISOString(),
    params,
    report,
  });
  await setOrderStlPath(order.id, stlPath);

  return { stlPath, bytes: stl.length, report };
}

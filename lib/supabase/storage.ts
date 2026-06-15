import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./admin";
import {
  STORAGE_BUCKET,
  STL_BUCKET,
  PHOTO_PATH_PREFIX,
  DOWNLOAD_URL_TTL_SECONDS,
} from "@/lib/constants";

/** Mint a unique server-controlled path + signed upload URL (service role). */
export async function createSignedUpload(): Promise<{
  path: string;
  token: string;
}> {
  const path = `${PHOTO_PATH_PREFIX}/${randomUUID()}.jpg`;
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed upload URL");
  }
  return { path, token: data.token };
}

/** Mint a short-lived signed download URL for the admin to fetch a photo. */
export async function createSignedDownload(path: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed download URL");
  }
  return data.signedUrl;
}

/** Download an order's photo as a Buffer (service role) for STL generation. */
export async function downloadPhoto(path: string): Promise<Buffer> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .download(path);
  if (error || !data) {
    throw error ?? new Error("Failed to download photo");
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Upload (or overwrite) a generated STL to the private STL bucket. */
export async function uploadStl(orderId: string, stl: Buffer): Promise<string> {
  const path = `stl/${orderId}.stl`;
  const { error } = await getSupabaseAdmin()
    .storage.from(STL_BUCKET)
    .upload(path, stl, { contentType: "model/stl", upsert: true });
  if (error) throw error;
  return path;
}

/** Mint a short-lived signed download URL for a generated STL. */
export async function createSignedStlDownload(path: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STL_BUCKET)
    .createSignedUrl(path, DOWNLOAD_URL_TTL_SECONDS);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed STL URL");
  }
  return data.signedUrl;
}

// The preview heightmap path is derived from the order id, so no DB column is
// needed: a generated order always has preview/<id>.png alongside its STL.
const PREVIEW_PREFIX = "preview";

/** Upload (or overwrite) the heightmap preview PNG for an order. */
export async function uploadPreview(orderId: string, png: Buffer): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .storage.from(STL_BUCKET)
    .upload(`${PREVIEW_PREFIX}/${orderId}.png`, png, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) throw error;
}

/** Mint a short-lived signed download URL for an order's preview heightmap. */
export async function createSignedPreviewDownload(
  orderId: string,
): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(STL_BUCKET)
    .createSignedUrl(`${PREVIEW_PREFIX}/${orderId}.png`, DOWNLOAD_URL_TTL_SECONDS);
  if (error || !data) {
    throw error ?? new Error("Failed to create signed preview URL");
  }
  return data.signedUrl;
}

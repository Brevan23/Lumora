import "server-only";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./admin";
import {
  STORAGE_BUCKET,
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

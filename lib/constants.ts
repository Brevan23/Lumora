// Hardcoded product + app constants for the Lumora lithophane MVP.

export const BRAND = "Lumora";

export const PRODUCT_NAME = "Custom Photo Lithophane";

/** Live price in cents (CAD). */
export const PRICE_CENTS = 4999;
/** Strike-through anchor price shown next to the live price. */
export const ANCHOR_PRICE_CENTS = 6999;
export const CURRENCY = "cad";

/** Product plate: 144 × 108 mm (14.4 × 10.8 cm), landscape — fits the Bambu frame & backlight board. */
export const FRAME_LABEL = "14.4 × 10.8 cm";
export const FRAME_WIDTH_CM = 14.4;
export const FRAME_HEIGHT_CM = 10.8;
/** Landscape crop aspect ratio, 4:3 (~1.333) — matches the 144×108 frame. */
export const CROP_ASPECT = 4 / 3;

/** Cap applies to the FINAL cropped JPEG that is actually uploaded. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
/** JPEG quality used when exporting the crop (keeps output size predictable). */
export const JPEG_QUALITY = 0.9;
/** Recommended minimum source long-edge (px); below this a plate may look soft. */
export const MIN_SOURCE_LONG_EDGE = 1000;

export const STORAGE_BUCKET = "lithophane-photos";
export const STL_BUCKET = "lithophane-stl";
export const PHOTO_PATH_PREFIX = "uploads";
/** Exact server-minted path shape; /api/checkout rejects anything else. */
export const PHOTO_PATH_REGEX = /^uploads\/[0-9a-f-]{36}\.jpg$/;
/** Admin signed download URL TTL — long enough to survive page dwell. */
export const DOWNLOAD_URL_TTL_SECONDS = 3600;
/** Longer-lived signed URL for download links emailed to the admin (7 days). */
export const EMAIL_LINK_TTL_SECONDS = 60 * 60 * 24 * 7;

export const SESSION_COOKIE = "lumora_admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const PRODUCTION_DAYS = "3–5";

// Accepted input types at the file picker (HEIC/HEIF converted client-side).
export const SUPPORTED_INPUT_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];
export const SUPPORTED_INPUT_EXT = [".jpg", ".jpeg", ".png", ".heic", ".heif"];

// Clearly-named placeholders — replace before launch.
export const CONTACT_EMAIL = "hello@lumora.example";
export const INSTAGRAM_URL = "https://instagram.com/lumora";

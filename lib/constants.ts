// Hardcoded product + app constants for the Lumora lithophane MVP.
import type { Orientation, PrintType, FrameColor } from "./types";

export const BRAND = "Illuminate Memories";

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
/** Customer-chosen frame orientation; both are 4:3, just rotated. Default portrait. */
export const DEFAULT_ORIENTATION: Orientation = "portrait";
/** Crop aspect (width/height) per orientation: portrait 3:4 (0.75), landscape 4:3 (1.333). */
export const CROP_ASPECT: Record<Orientation, number> = {
  portrait: 3 / 4,
  landscape: 4 / 3,
};

/** Full-colour (CMYK) print upcharge over the base price, in cents. */
export const COLOR_UPCHARGE_CENTS = 1000;
/** Order option defaults. */
export const DEFAULT_PRINT_TYPE: PrintType = "standard";
export const DEFAULT_FRAME_COLOR: FrameColor = "black";

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

export const CONTACT_EMAIL = "illuminatememories.ca@gmail.com";
// Empty hides the Instagram link in the footer until a real handle is set.
export const INSTAGRAM_URL = "";

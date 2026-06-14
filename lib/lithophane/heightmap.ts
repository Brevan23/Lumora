import sharp from "sharp";

export interface LuminanceGrid {
  width: number;
  height: number;
  /** 8-bit grayscale, row-major: data[y*width + x]. */
  data: Buffer;
}

/**
 * Decode an image to a grayscale luminance grid at the requested resolution.
 * Auto-orients via EXIF, converts to grayscale, and resizes (fit: "fill" — the
 * caller passes a grid that matches the image's 17:22 ratio, so no distortion).
 */
export async function imageToLuminance(
  image: Buffer,
  width: number,
  height: number,
): Promise<LuminanceGrid> {
  const { data, info } = await sharp(image)
    .rotate()
    .grayscale()
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Grayscale raw output is 1 channel; guard in case sharp returns more.
  if (info.channels === 1) {
    return { width: info.width, height: info.height, data };
  }
  const ch = info.channels;
  const gray = Buffer.alloc(info.width * info.height);
  for (let p = 0; p < gray.length; p++) {
    gray[p] = data[p * ch];
  }
  return { width: info.width, height: info.height, data: gray };
}

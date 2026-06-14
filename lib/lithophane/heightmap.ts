import { decode } from "jpeg-js";

export interface LuminanceGrid {
  width: number;
  height: number;
  /** 8-bit grayscale, row-major: data[y*width + x]. */
  data: Uint8Array;
}

/**
 * Decode an image to a grayscale luminance grid at the requested resolution.
 *
 * The cropped uploads are always baseline JPEG (exported from the browser
 * canvas; HEIC is converted to JPEG client-side first), so a pure-JS JPEG
 * decoder is sufficient — and unlike sharp it has no native binary, so it loads
 * reliably in Vercel serverless functions. Downsampling is a box average over
 * the source pixels mapping to each target cell. The canvas-exported JPEG has
 * no EXIF orientation, so no auto-orient step is needed.
 */
export function imageToLuminance(
  image: Buffer,
  targetW: number,
  targetH: number,
): LuminanceGrid {
  const decoded = decode(image, {
    useTArray: true,
    maxMemoryUsageInMB: 1024,
    maxResolutionInMP: 200,
  });
  const sw = decoded.width;
  const sh = decoded.height;
  const src = decoded.data; // RGBA
  const out = new Uint8Array(targetW * targetH);

  for (let ty = 0; ty < targetH; ty++) {
    const sy0 = Math.floor((ty * sh) / targetH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * sh) / targetH));
    for (let tx = 0; tx < targetW; tx++) {
      const sx0 = Math.floor((tx * sw) / targetW);
      const sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * sw) / targetW));
      let sum = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        let o = (sy * sw + sx0) * 4;
        for (let sx = sx0; sx < sx1; sx++) {
          // Rec.601 luma
          sum += 0.299 * src[o] + 0.587 * src[o + 1] + 0.114 * src[o + 2];
          o += 4;
          n += 1;
        }
      }
      out[ty * targetW + tx] = n ? Math.round(sum / n) : 0;
    }
  }

  return { width: targetW, height: targetH, data: out };
}

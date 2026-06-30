import { decode } from "jpeg-js";

// RGB front-end of the colour pipeline. The uploaded photo is already a baked,
// upright JPEG (the in-browser crop applies EXIF orientation and exports JPEG),
// so orientation is handled client-side. Here we cover-fit + centre-crop the
// decoded RGBA to the colour grid and return per-channel sRGB in [0,1].

export interface ColorContent {
  /** Grid columns (vertices across). */
  width: number;
  /** Grid rows (vertices down). */
  height: number;
  /** Per-channel sRGB in [0,1], row-major, row 0 = top of the photo. */
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  /** Long edge of the decoded source — for the min-resolution guard. */
  sourceLongEdge: number;
}

/**
 * Cover-fit (scale to fill) + centre-crop the decoded photo to a gw × gh grid,
 * box-averaging the source pixels per cell. Mirrors the monochrome
 * coverFitCrop, but keeps the three colour channels.
 */
export function processImageToColor(
  image: Buffer,
  gw: number,
  gh: number,
): ColorContent {
  const d = decode(image, {
    useTArray: true,
    maxMemoryUsageInMB: 1024,
    maxResolutionInMP: 200,
  });
  const sw = d.width;
  const sh = d.height;
  const px = d.data;

  const scale = Math.max(gw / sw, gh / sh);
  const offX = (sw * scale - gw) / 2;
  const offY = (sh * scale - gh) / 2;
  const half = 0.5 / scale; // half source-px footprint per target px

  const r = new Float32Array(gw * gh);
  const g = new Float32Array(gw * gh);
  const b = new Float32Array(gw * gh);

  for (let ty = 0; ty < gh; ty++) {
    const scy = (offY + ty + 0.5) / scale;
    let sy0 = Math.floor(scy - half);
    let sy1 = Math.ceil(scy + half);
    if (sy0 < 0) sy0 = 0;
    if (sy1 > sh) sy1 = sh;
    if (sy1 <= sy0) sy1 = Math.min(sh, sy0 + 1);
    for (let tx = 0; tx < gw; tx++) {
      const scx = (offX + tx + 0.5) / scale;
      let sx0 = Math.floor(scx - half);
      let sx1 = Math.ceil(scx + half);
      if (sx0 < 0) sx0 = 0;
      if (sx1 > sw) sx1 = sw;
      if (sx1 <= sx0) sx1 = Math.min(sw, sx0 + 1);
      let rs = 0, gs = 0, bs = 0, c = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        let o = (sy * sw + sx0) * 4;
        for (let sx = sx0; sx < sx1; sx++) {
          rs += px[o];
          gs += px[o + 1];
          bs += px[o + 2];
          o += 4;
          c++;
        }
      }
      const idx = ty * gw + tx;
      if (c) {
        r[idx] = rs / c / 255;
        g[idx] = gs / c / 255;
        b[idx] = bs / c / 255;
      }
    }
  }

  return { width: gw, height: gh, r, g, b, sourceLongEdge: Math.max(sw, sh) };
}

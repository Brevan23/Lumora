import { decode } from "jpeg-js";
import type { LithophaneParams } from "./params";

// Pure-JS image front-end of the lithophane pipeline. The uploaded photo is
// already a baked, upright JPEG (the in-browser crop applies EXIF orientation
// and exports JPEG), so EXIF auto-orient is handled client-side. Steps here, in
// the spec's order: grayscale → autocontrast(1%) → Gaussian blur → cover-fit +
// center-crop to the content grid → normalize → gamma.

/** 1% (per side) auto-contrast: stretch [lo,hi] percentile range to [0,255]. */
function autocontrast(gray: Float32Array, cutoffPct: number): void {
  const n = gray.length;
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    let v = gray[i] | 0;
    if (v < 0) v = 0;
    else if (v > 255) v = 255;
    hist[v]++;
  }
  const cut = Math.floor((n * cutoffPct) / 100);
  let lo = 0;
  for (let acc = 0; lo < 255; lo++) {
    acc += hist[lo];
    if (acc > cut) break;
  }
  let hi = 255;
  for (let acc = 0; hi > 0; hi--) {
    acc += hist[hi];
    if (acc > cut) break;
  }
  if (hi <= lo) return; // flat image — leave as-is
  const scale = 255 / (hi - lo);
  for (let i = 0; i < n; i++) {
    let v = (gray[i] - lo) * scale;
    if (v < 0) v = 0;
    else if (v > 255) v = 255;
    gray[i] = v;
  }
}

/** Separable Gaussian blur (denoise) with clamp-to-edge, std-dev = sigma px. */
function gaussianBlur(gray: Float32Array, w: number, h: number, sigma: number): void {
  if (sigma <= 0) return;
  const r = Math.max(1, Math.ceil(3 * sigma));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let t = -r; t <= r; t++) {
    const e = Math.exp(-(t * t) / (2 * sigma * sigma));
    k[t + r] = e;
    sum += e;
  }
  for (let t = 0; t < k.length; t++) k[t] /= sum;

  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let t = -r; t <= r; t++) {
        let xx = x + t;
        if (xx < 0) xx = 0;
        else if (xx >= w) xx = w - 1;
        s += gray[row + xx] * k[t + r];
      }
      tmp[row + x] = s;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let t = -r; t <= r; t++) {
        let yy = y + t;
        if (yy < 0) yy = 0;
        else if (yy >= h) yy = h - 1;
        s += tmp[yy * w + x] * k[t + r];
      }
      gray[y * w + x] = s;
    }
  }
}

/** Cover-fit (scale to fill) + center-crop to the target grid, box-averaged. */
function coverFitCrop(
  src: Float32Array,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): Float32Array {
  const scale = Math.max(tw / sw, th / sh);
  const offX = (sw * scale - tw) / 2;
  const offY = (sh * scale - th) / 2;
  const half = 0.5 / scale; // half source-px footprint per target px
  const out = new Float32Array(tw * th);

  for (let ty = 0; ty < th; ty++) {
    const scy = (offY + ty + 0.5) / scale;
    let sy0 = Math.floor(scy - half);
    let sy1 = Math.ceil(scy + half);
    if (sy0 < 0) sy0 = 0;
    if (sy1 > sh) sy1 = sh;
    if (sy1 <= sy0) sy1 = Math.min(sh, sy0 + 1);
    for (let tx = 0; tx < tw; tx++) {
      const scx = (offX + tx + 0.5) / scale;
      let sx0 = Math.floor(scx - half);
      let sx1 = Math.ceil(scx + half);
      if (sx0 < 0) sx0 = 0;
      if (sx1 > sw) sx1 = sw;
      if (sx1 <= sx0) sx1 = Math.min(sw, sx0 + 1);
      let s = 0;
      let c = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        const row = sy * sw;
        for (let sx = sx0; sx < sx1; sx++) {
          s += src[row + sx];
          c++;
        }
      }
      out[ty * tw + tx] = c ? s / c : 0;
    }
  }
  return out;
}

export interface ContentImage {
  width: number;
  height: number;
  /** [0,1] luminance after gamma, row 0 = top of the photo. */
  lum: Float32Array;
  /** Long edge of the decoded source — for the min-resolution guard. */
  sourceLongEdge: number;
}

export function processImageToContent(
  image: Buffer,
  contentW: number,
  contentH: number,
  p: LithophaneParams,
): ContentImage {
  const d = decode(image, {
    useTArray: true,
    maxMemoryUsageInMB: 1024,
    maxResolutionInMP: 200,
  });
  const sw = d.width;
  const sh = d.height;
  const rgba = d.data;

  const gray = new Float32Array(sw * sh);
  for (let i = 0, o = 0; i < gray.length; i++, o += 4) {
    gray[i] = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  }

  autocontrast(gray, p.autocontrastCutoff);
  gaussianBlur(gray, sw, sh, p.blurPx);

  const content = coverFitCrop(gray, sw, sh, contentW, contentH);
  for (let i = 0; i < content.length; i++) {
    let v = content[i] / 255;
    if (v < 0) v = 0;
    else if (v > 1) v = 1;
    content[i] = Math.pow(v, p.gamma);
  }

  return {
    width: contentW,
    height: contentH,
    lum: content,
    sourceLongEdge: Math.max(sw, sh),
  };
}

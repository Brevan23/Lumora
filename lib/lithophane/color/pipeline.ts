import type { ColorContent } from "./image";
import type { ColorLithophaneParams } from "./params";

// Build the stacked height fields, following Lithophane Maker's split:
//   white base (flat) → C → M → Y (COARSE, thin, carries hue)
//                    → white relief (FINE, carries detail/brightness).
// Chroma is averaged over coarse colour blocks and held piecewise-constant per
// block (so it reads as colour, not noise); luminance is taken at full fine
// resolution. All fields live on the same fine vertex grid, so adjacent slabs
// share vertex z-values at their interfaces and the stack stays watertight.

export interface ColorFields {
  /** Grid dims (vertices). */
  nxv: number;
  nyv: number;
  /** Flat white diffuser base height, mm. */
  whiteBaseMm: number;
  /** Cumulative tops, mm, row-major (length nxv*nyv). */
  cyanTop: Float32Array; // whiteBase + tC
  magentaTop: Float32Array; // cyanTop + tM
  colorTop: Float32Array; // magentaTop + tY  (= yellow ceiling = relief floor)
  reliefTop: Float32Array; // colorTop + reliefThickness  (total panel height)
  /** Luminance [0,1] (sharp) — drives preview brightness. */
  bright: Float32Array;
  /** Realised colorant fractions [0,1] per channel (blocky) — preview tint. */
  cUsed: Float32Array;
  mUsed: Float32Array;
  yUsed: Float32Array;
}

export function buildColorFields(
  rgb: ColorContent,
  lum: Float32Array,
  p: ColorLithophaneParams,
): ColorFields {
  const nxv = rgb.width;
  const nyv = rgb.height;
  const n = nxv * nyv;
  const {
    layerHeightMm: lh,
    colorBandMaxMm: band,
    whiteBaseMm: wb,
    minThicknessMm: minT,
    maxThicknessMm: maxT,
    colorGamma: cg,
  } = p;

  // --- coarse colour blocks: average each channel over ~colorBlockMm cells ---
  const bc = Math.max(1, Math.round(p.colorBlockMm * p.lithophaneSamplesPerMm));
  const bcols = Math.ceil(nxv / bc);
  const brows = Math.ceil(nyv / bc);
  const nb = bcols * brows;
  const sumR = new Float64Array(nb);
  const sumG = new Float64Array(nb);
  const sumB = new Float64Array(nb);
  const cnt = new Float64Array(nb);
  const srcOf = (i: number, j: number) => j * nxv + (p.mirror ? nxv - 1 - i : i);
  const blockOf = (i: number, j: number) =>
    Math.floor(j / bc) * bcols + Math.floor(i / bc);

  for (let j = 0; j < nyv; j++) {
    for (let i = 0; i < nxv; i++) {
      const s = srcOf(i, j);
      const b = blockOf(i, j);
      sumR[b] += rgb.r[s];
      sumG[b] += rgb.g[s];
      sumB[b] += rgb.b[s];
      cnt[b] += 1;
    }
  }

  // Subtractive colorant amount per channel (more where the channel is darker),
  // gently from sRGB so the image survives; quantise to layers; cap the C+M+Y
  // sum to the thin colour band so it never bloats the panel or muddies.
  const colorant = (v: number): number => {
    let a = 1 - v;
    if (a < 0) a = 0;
    else if (a > 1) a = 1;
    return cg === 1 ? a : Math.pow(a, cg);
  };
  const quant = (t: number): number => {
    let layers = Math.round(t / lh);
    if (layers <= 0) return 0;
    if (layers < p.minColorLayers) layers = p.minColorLayers;
    return layers * lh;
  };
  const bCy = new Float32Array(nb);
  const bMg = new Float32Array(nb);
  const bYl = new Float32Array(nb);
  for (let b = 0; b < nb; b++) {
    const c = cnt[b] || 1;
    let tc = colorant(sumR[b] / c) * band;
    let tm = colorant(sumG[b] / c) * band;
    let ty = colorant(sumB[b] / c) * band;
    const sum = tc + tm + ty;
    if (sum > band && sum > 0) {
      const k = band / sum;
      tc *= k;
      tm *= k;
      ty *= k;
    }
    bCy[b] = quant(tc);
    bMg[b] = quant(tm);
    bYl[b] = quant(ty);
  }

  // --- fine fields: cumulative colour tops (blocky) + luminance relief ---
  const cyanTop = new Float32Array(n);
  const magentaTop = new Float32Array(n);
  const colorTop = new Float32Array(n);
  const reliefTop = new Float32Array(n);
  const bright = new Float32Array(n);
  const cUsed = new Float32Array(n);
  const mUsed = new Float32Array(n);
  const yUsed = new Float32Array(n);
  const reliefRange = maxT - minT;

  for (let j = 0; j < nyv; j++) {
    for (let i = 0; i < nxv; i++) {
      const dst = j * nxv + i;
      const b = blockOf(i, j);
      const tc = bCy[b];
      const tm = bMg[b];
      const ty = bYl[b];
      const ct = wb + tc;
      const mt = ct + tm;
      const yt = mt + ty;
      cyanTop[dst] = ct;
      magentaTop[dst] = mt;
      colorTop[dst] = yt;
      const l = lum[srcOf(i, j)]; // [0,1], already gamma'd by the mono front-end
      reliefTop[dst] = yt + minT + reliefRange * (1 - l);
      bright[dst] = l;
      cUsed[dst] = band > 0 ? tc / band : 0;
      mUsed[dst] = band > 0 ? tm / band : 0;
      yUsed[dst] = band > 0 ? ty / band : 0;
    }
  }

  return {
    nxv,
    nyv,
    whiteBaseMm: wb,
    cyanTop,
    magentaTop,
    colorTop,
    reliefTop,
    bright,
    cUsed,
    mUsed,
    yUsed,
  };
}

import type { ColorContent } from "./image";
import type { ColorLithophaneParams } from "./params";

// Dual-resolution fields, following Lithophane Maker's split:
//   white base (flat) → C → M → Y  — COARSE, thin, carries HUE (coarse grid)
//                    → white relief — FINE, carries DETAIL/brightness (fine grid)
// Colour is sampled on a coarse grid (≈ colorBlockMm) so the colour parts stay
// small; luminance is full-resolution. The fine relief floor is sampled from the
// coarse colour top (with a hair of overlap) so it sits flush on the colour band
// with no floating gap.

export interface ColorFields {
  // --- coarse colour grid (drives the white base + C/M/Y slabs) ---
  cnxv: number;
  cnyv: number;
  cyanTop: Float32Array; // coarse: whiteBase + tC
  magentaTop: Float32Array; // coarse: + tM
  colorTop: Float32Array; // coarse: + tY  (yellow ceiling)
  // --- fine relief grid (drives the white luminance relief) ---
  nxv: number;
  nyv: number;
  reliefFloor: Float32Array; // fine: sits on the colour band (sampled colorTop − overlap)
  reliefTop: Float32Array; // fine: colour top + luminance relief
  whiteBaseMm: number;
  // --- preview (fine) ---
  bright: Float32Array;
  cUsed: Float32Array;
  mUsed: Float32Array;
  yUsed: Float32Array;
}

export function buildColorFields(
  coarse: ColorContent,
  fineLum: Float32Array,
  fineNxv: number,
  fineNyv: number,
  p: ColorLithophaneParams,
): ColorFields {
  const cnxv = coarse.width;
  const cnyv = coarse.height;
  const nc = cnxv * cnyv;
  const {
    layerHeightMm: lh,
    colorBandMaxMm: band,
    whiteBaseMm: wb,
    minThicknessMm: minT,
    maxThicknessMm: maxT,
    colorGamma: cg,
  } = p;

  // Subtractive colorant amount per channel (more where the channel is darker),
  // gently from sRGB so the image survives. `colorGamma` is a tunable contrast.
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

  // --- coarse colour tops + fractions (per coarse vertex) ---
  const cyanTop = new Float32Array(nc);
  const magentaTop = new Float32Array(nc);
  const colorTop = new Float32Array(nc);
  const cFrac = new Float32Array(nc);
  const mFrac = new Float32Array(nc);
  const yFrac = new Float32Array(nc);
  for (let j = 0; j < cnyv; j++) {
    for (let i = 0; i < cnxv; i++) {
      const dst = j * cnxv + i;
      const src = j * cnxv + (p.mirror ? cnxv - 1 - i : i);
      let tc = colorant(coarse.r[src]) * band;
      let tm = colorant(coarse.g[src]) * band;
      let ty = colorant(coarse.b[src]) * band;
      const sum = tc + tm + ty;
      if (sum > band && sum > 0) {
        const k = band / sum;
        tc *= k;
        tm *= k;
        ty *= k;
      }
      tc = quant(tc);
      tm = quant(tm);
      ty = quant(ty);
      const ct = wb + tc;
      const mt = ct + tm;
      const yt = mt + ty;
      cyanTop[dst] = ct;
      magentaTop[dst] = mt;
      colorTop[dst] = yt;
      cFrac[dst] = band > 0 ? tc / band : 0;
      mFrac[dst] = band > 0 ? tm / band : 0;
      yFrac[dst] = band > 0 ? ty / band : 0;
    }
  }

  // Bilinear sample of a coarse field at normalised (u,v) in [0,1].
  const sample = (arr: Float32Array, u: number, v: number): number => {
    const cx = u * (cnxv - 1);
    const cy = v * (cnyv - 1);
    let i0 = Math.floor(cx);
    let j0 = Math.floor(cy);
    if (i0 < 0) i0 = 0;
    else if (cnxv >= 2 && i0 > cnxv - 2) i0 = cnxv - 2;
    if (j0 < 0) j0 = 0;
    else if (cnyv >= 2 && j0 > cnyv - 2) j0 = cnyv - 2;
    const i1 = Math.min(i0 + 1, cnxv - 1);
    const j1 = Math.min(j0 + 1, cnyv - 1);
    const fx = cx - i0;
    const fy = cy - j0;
    const a = arr[j0 * cnxv + i0];
    const b = arr[j0 * cnxv + i1];
    const c = arr[j1 * cnxv + i0];
    const d = arr[j1 * cnxv + i1];
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  };

  // --- fine relief + preview fields ---
  const nf = fineNxv * fineNyv;
  const reliefFloor = new Float32Array(nf);
  const reliefTop = new Float32Array(nf);
  const bright = new Float32Array(nf);
  const cUsed = new Float32Array(nf);
  const mUsed = new Float32Array(nf);
  const yUsed = new Float32Array(nf);
  const range = maxT - minT;
  // Embed the relief a hair into the colour band so it always makes contact
  // (no floating gap) despite the coarse-vs-fine surface mismatch.
  const overlap = Math.min(lh, 0.1);

  for (let j = 0; j < fineNyv; j++) {
    const v = fineNyv > 1 ? j / (fineNyv - 1) : 0;
    for (let i = 0; i < fineNxv; i++) {
      const dst = j * fineNxv + i;
      const u = fineNxv > 1 ? i / (fineNxv - 1) : 0;
      const ct = sample(colorTop, u, v);
      let floor = ct - overlap;
      if (floor < wb) floor = wb;
      reliefFloor[dst] = floor;
      const src = j * fineNxv + (p.mirror ? fineNxv - 1 - i : i);
      const l = fineLum[src];
      reliefTop[dst] = ct + minT + range * (1 - l);
      bright[dst] = l;
      cUsed[dst] = sample(cFrac, u, v);
      mUsed[dst] = sample(mFrac, u, v);
      yUsed[dst] = sample(yFrac, u, v);
    }
  }

  return {
    cnxv,
    cnyv,
    cyanTop,
    magentaTop,
    colorTop,
    nxv: fineNxv,
    nyv: fineNyv,
    reliefFloor,
    reliefTop,
    whiteBaseMm: wb,
    bright,
    cUsed,
    mUsed,
    yUsed,
  };
}

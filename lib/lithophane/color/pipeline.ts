import type { ColorContent } from "./image";
import type { ColorLithophaneParams } from "./params";

// The per-pixel colour pipeline. For each grid vertex we decode sRGB to linear
// light, apply a backlight tone curve, derive subtractive C/M/Y colorant amounts
// (cyan blocks red, magenta green, yellow blue), and quantise each to a printed
// thickness on the layer grid. The cumulative tops define the four stacked solids
// the mesher turns into geometry.
//
// This linear-after-gamma mapping (thickness ∝ 1 − tonedChannel) is the
// calibration-tunable v1. A Beer–Lambert / measured-crosstalk refinement
// (thickness = A⁻¹ · −log10(T)) can replace `colorant()` later without touching
// the rest of the pipeline.

export interface ColorFields {
  /** Grid dims (vertices). */
  nxv: number;
  nyv: number;
  /** Cumulative top surfaces, mm, row-major (length nxv*nyv). */
  whiteTop: Float32Array; // constant whiteBaseMm
  cyanTop: Float32Array; // whiteBase + tC
  magentaTop: Float32Array; // cyanTop + tM
  yellowTop: Float32Array; // magentaTop + tY  (total panel height)
  /** Realised colorant fractions [0,1] per channel — drives the preview render. */
  cUsed: Float32Array;
  mUsed: Float32Array;
  yUsed: Float32Array;
}

const srgbToLinear = (s: number): number =>
  s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);

export function buildColorFields(
  img: ColorContent,
  p: ColorLithophaneParams,
): ColorFields {
  const nxv = img.width;
  const nyv = img.height;
  const n = nxv * nyv;
  const { layerHeightMm: lh, maxPerChannelMm: maxT, gammaBacklight: gB } = p;
  const maxLayers = Math.max(1, Math.round(maxT / lh));

  const whiteTop = new Float32Array(n).fill(p.whiteBaseMm);
  const cyanTop = new Float32Array(n);
  const magentaTop = new Float32Array(n);
  const yellowTop = new Float32Array(n);
  const cUsed = new Float32Array(n);
  const mUsed = new Float32Array(n);
  const yUsed = new Float32Array(n);

  // Quantise a colorant amount [0,1] to a printed thickness (mm) on the layer
  // grid, snapping a thin-but-nonzero result up to the minimum feature so a
  // single patchy layer never appears.
  const quantThickness = (amount: number): number => {
    let layers = Math.round((amount > 0 ? amount : 0) * maxLayers);
    if (layers <= 0) return 0;
    if (layers < p.minColorLayers) layers = p.minColorLayers;
    if (layers > maxLayers) layers = maxLayers;
    return layers * lh;
  };

  for (let j = 0; j < nyv; j++) {
    for (let i = 0; i < nxv; i++) {
      const dst = j * nxv + i;
      const src = j * nxv + (p.mirror ? nxv - 1 - i : i);
      // sRGB → linear → backlight tone curve (deepen midtones).
      const tr = Math.pow(srgbToLinear(img.r[src]), gB);
      const tg = Math.pow(srgbToLinear(img.g[src]), gB);
      const tb = Math.pow(srgbToLinear(img.b[src]), gB);
      const tc = quantThickness(1 - tr);
      const tm = quantThickness(1 - tg);
      const ty = quantThickness(1 - tb);
      const ct = p.whiteBaseMm + tc;
      const mt = ct + tm;
      const yt = mt + ty;
      cyanTop[dst] = ct;
      magentaTop[dst] = mt;
      yellowTop[dst] = yt;
      cUsed[dst] = tc / maxT;
      mUsed[dst] = tm / maxT;
      yUsed[dst] = ty / maxT;
    }
  }

  return { nxv, nyv, whiteTop, cyanTop, magentaTop, yellowTop, cUsed, mUsed, yUsed };
}

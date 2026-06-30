import { encodeRgbPng } from "../png";
import type { ColorFields } from "./pipeline";
import type { ColorLithophaneParams } from "./params";

// Predicted backlit appearance. From the realised colorant fractions we invert
// the pipeline — transmittance ≈ 1 − colorantUsed per channel, undo the
// backlight gamma, then encode to sRGB — so the owner can eyeball the result
// before printing. It's an approximation (no filament-cross-absorption /
// calibration), but tracks the print closely enough to judge framing & colour.

const linToSrgb = (l: number): number =>
  l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;

const toByte = (v: number): number => (v < 0 ? 0 : v > 1 ? 255 : Math.round(v * 255));

export function renderColorPreview(
  fields: ColorFields,
  p: ColorLithophaneParams,
): Buffer {
  const { nxv, nyv, cUsed, mUsed, yUsed } = fields;
  const n = nxv * nyv;
  const rgb = new Uint8Array(n * 3);
  const invG = 1 / p.gammaBacklight;
  for (let i = 0; i < n; i++) {
    const tr = Math.max(0, 1 - cUsed[i]);
    const tg = Math.max(0, 1 - mUsed[i]);
    const tb = Math.max(0, 1 - yUsed[i]);
    const o = i * 3;
    rgb[o] = toByte(linToSrgb(Math.pow(tr, invG)));
    rgb[o + 1] = toByte(linToSrgb(Math.pow(tg, invG)));
    rgb[o + 2] = toByte(linToSrgb(Math.pow(tb, invG)));
  }
  return encodeRgbPng(nxv, nyv, rgb);
}

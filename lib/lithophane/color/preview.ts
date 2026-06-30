import { encodeRgbPng } from "../png";
import type { ColorFields } from "./pipeline";

// Predicted backlit appearance. Each channel's transmitted light ≈ 1 − the
// colorant used on it, shown directly (no inverse-gamma trickery) so the
// preview faithfully reflects what's printed — if the colour math collapses
// the image into mud, the preview shows mud too. It's still an approximation
// (no filament cross-absorption / calibration), but tracks the print closely
// enough to judge framing and colour.

const toByte = (v: number): number => (v < 0 ? 0 : v > 1 ? 255 : Math.round(v * 255));

export function renderColorPreview(fields: ColorFields): Buffer {
  const { nxv, nyv, cUsed, mUsed, yUsed } = fields;
  const n = nxv * nyv;
  const rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    rgb[o] = toByte(1 - cUsed[i]); // cyan blocks red
    rgb[o + 1] = toByte(1 - mUsed[i]); // magenta blocks green
    rgb[o + 2] = toByte(1 - yUsed[i]); // yellow blocks blue
  }
  return encodeRgbPng(nxv, nyv, rgb);
}

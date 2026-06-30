import { encodeRgbPng } from "../png";
import type { ColorFields } from "./pipeline";

// Predicted lit appearance: sharp BRIGHTNESS from the fine luminance relief,
// TINTED by the coarse colorant (each channel's transmitted light ≈ brightness ×
// (1 − colorant used on it)). This mirrors how the print reads when backlit — a
// crisp image carrying real colour — so it's an honest preview, not a mask.

const toByte = (v: number): number => (v < 0 ? 0 : v > 1 ? 255 : Math.round(v * 255));

export function renderColorPreview(fields: ColorFields): Buffer {
  const { nxv, nyv, bright, cUsed, mUsed, yUsed } = fields;
  const n = nxv * nyv;
  const rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    const b = bright[i];
    const o = i * 3;
    rgb[o] = toByte(b * (1 - cUsed[i])); // cyan blocks red
    rgb[o + 1] = toByte(b * (1 - mUsed[i])); // magenta blocks green
    rgb[o + 2] = toByte(b * (1 - yUsed[i])); // yellow blocks blue
  }
  return encodeRgbPng(nxv, nyv, rgb);
}

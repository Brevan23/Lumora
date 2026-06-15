import type { LithophaneParams } from "./params";
import type { ContentImage } from "./image";

export interface ThicknessField {
  nx: number;
  ny: number;
  /** Vertex thicknesses (mm), row-major z[j*nx + i]. */
  z: Float32Array;
  observedMin: number;
  observedMax: number;
}

/**
 * Build the full-plate thickness field: a constant max-thickness border+safety
 * ring (opaque frame), and a content region where thickness = min + (max−min)·
 * (1 − pixel) so white→thin, black→thick. Content is placed flipud so the top
 * of the photo is the top of the plate.
 */
export function buildThicknessField(
  content: ContentImage,
  nx: number,
  ny: number,
  p: LithophaneParams,
): ThicknessField {
  const z = new Float32Array(nx * ny);
  const cw = content.width;
  const ch = content.height;
  const insetX = Math.floor((nx - cw) / 2);
  const insetY = Math.floor((ny - ch) / 2);
  const range = p.maxThicknessMm - p.minThicknessMm;
  let mn = Infinity;
  let mx = -Infinity;

  for (let j = 0; j < ny; j++) {
    const inY = j >= insetY && j < insetY + ch;
    for (let i = 0; i < nx; i++) {
      const inX = i >= insetX && i < insetX + cw;
      let t: number;
      if (inX && inY) {
        const ci = i - insetX;
        const cjPlate = j - insetY; // 0 = bottom of content region
        const imgRow = ch - 1 - cjPlate; // flipud: photo top → plate top
        const lum = content.lum[imgRow * cw + ci];
        t = p.minThicknessMm + range * (1 - lum);
      } else {
        t = p.maxThicknessMm; // border + safety ring
      }
      z[j * nx + i] = t;
      if (t < mn) mn = t;
      if (t > mx) mx = t;
    }
  }

  return { nx, ny, z, observedMin: mn, observedMax: mx };
}

/** Flip the field left↔right (for the front-face-down print STL). */
export function mirrorColumns(
  z: Float32Array,
  nx: number,
  ny: number,
): Float32Array {
  const out = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i < nx; i++) out[row + i] = z[row + (nx - 1 - i)];
  }
  return out;
}

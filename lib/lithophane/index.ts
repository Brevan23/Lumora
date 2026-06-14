import { DEFAULT_LITHOPHANE_PARAMS, type LithophaneParams } from "./params";
import { imageToLuminance } from "./heightmap";
import { BinaryStlWriter } from "./stl";
import { emitMesh, countTriangles, type HeightGrid } from "./mesh";

/**
 * Generate a printable flat lithophane (with a raised border) from a photo,
 * returning a binary STL buffer. Pure geometry — deterministic.
 */
export async function generateLithophaneStl(
  image: Buffer,
  override?: Partial<LithophaneParams>,
): Promise<Buffer> {
  const p = { ...DEFAULT_LITHOPHANE_PARAMS, ...override };

  const outerW = p.reliefWidthMm + 2 * p.borderMm;
  const outerH = p.reliefHeightMm + 2 * p.borderMm;

  // Pick a cell size that respects the maxCells cap. Guard against degenerate
  // overrides (params are a deliberate extension point for future size presets)
  // so this loop can never spin forever.
  let cell = p.cellMm > 0 ? p.cellMm : DEFAULT_LITHOPHANE_PARAMS.cellMm;
  const cap = p.maxCells > 0 ? p.maxCells : DEFAULT_LITHOPHANE_PARAMS.maxCells;
  let cols = Math.max(1, Math.round(outerW / cell));
  let rows = Math.max(1, Math.round(outerH / cell));
  while (cols * rows > cap) {
    cell *= 1.15;
    cols = Math.max(1, Math.round(outerW / cell));
    rows = Math.max(1, Math.round(outerH / cell));
  }

  // Sample the photo at ~one pixel per relief vertex.
  const reliefVx = Math.max(2, Math.round(p.reliefWidthMm / cell) + 1);
  const reliefVy = Math.max(2, Math.round(p.reliefHeightMm / cell) + 1);
  const lum = await imageToLuminance(image, reliefVx, reliefVy);

  const nxv = cols + 1;
  const nyv = rows + 1;
  const z = new Float32Array(nxv * nyv);
  const b = p.borderMm;
  const rw = p.reliefWidthMm;
  const rh = p.reliefHeightMm;
  const range = p.maxThicknessMm - p.minThicknessMm;

  for (let j = 0; j < nyv; j++) {
    const y = (j * outerH) / rows;
    for (let i = 0; i < nxv; i++) {
      const x = (i * outerW) / cols;
      let zz: number;
      if (x < b || x > b + rw || y < b || y > b + rh) {
        zz = p.borderThicknessMm; // flat border ring
      } else {
        const u = (x - b) / rw;
        const v = (y - b) / rh;
        const px = Math.min(lum.width - 1, Math.max(0, Math.round(u * (lum.width - 1))));
        const py = Math.min(lum.height - 1, Math.max(0, Math.round(v * (lum.height - 1))));
        let L = lum.data[py * lum.width + px] / 255; // 0 (dark) .. 1 (bright)
        if (p.gamma !== 1) L = Math.pow(L, p.gamma);
        zz = p.minThicknessMm + (1 - L) * range; // dark → thick, bright → thin
      }
      z[j * nxv + i] = zz;
    }
  }

  const grid: HeightGrid = { cols, rows, width: outerW, height: outerH, z };
  const writer = new BinaryStlWriter(countTriangles(cols, rows));
  emitMesh(grid, writer);
  return writer.finish();
}

export { DEFAULT_LITHOPHANE_PARAMS } from "./params";
export type { LithophaneParams } from "./params";

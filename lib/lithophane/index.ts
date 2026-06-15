import { DEFAULT_LITHOPHANE_PARAMS, type LithophaneParams } from "./params";
import { processImageToContent } from "./image";
import { buildThicknessField, mirrorColumns } from "./thickness";
import { BinaryStlWriter } from "./stl";
import { emitMesh, countTriangles, type HeightGrid } from "./mesh";
import { encodeGrayPng } from "./png";
import { validateValueGates, type ValidationReport } from "./validate";

export interface LithophaneResult {
  /** Print-ready binary STL (mirrored for front-face-down printing). */
  stl: Buffer;
  /** Unmirrored heightmap preview PNG (white = thick) for framing confirmation. */
  previewPng: Buffer;
  report: ValidationReport;
}

/**
 * Photo → print-ready lithophane. Deterministic: same image + params →
 * identical output. Returns the mirrored print STL, an unmirrored preview
 * heightmap, and the validation report (throws if the value gate fails).
 */
export async function generateLithophane(
  image: Buffer,
  override?: Partial<LithophaneParams>,
): Promise<LithophaneResult> {
  const p = { ...DEFAULT_LITHOPHANE_PARAMS, ...override };
  const spm =
    p.samplesPerMm > 0 ? p.samplesPerMm : DEFAULT_LITHOPHANE_PARAMS.samplesPerMm;

  const nx = Math.max(2, Math.round(p.widthMm * spm));
  const ny = Math.max(2, Math.round(p.heightMm * spm));
  const inset = p.borderMm + p.safetyMm;
  const cw = Math.max(2, Math.round((p.widthMm - 2 * inset) * spm));
  const ch = Math.max(2, Math.round((p.heightMm - 2 * inset) * spm));

  const content = processImageToContent(image, cw, ch, p);
  const field = buildThicknessField(content, nx, ny, p);

  // Preview heightmap: unmirrored, picture-up (PNG row 0 = plate top), white = thick.
  const gray = new Uint8Array(nx * ny);
  const inv = 255 / p.maxThicknessMm;
  for (let r = 0; r < ny; r++) {
    const plateJ = ny - 1 - r;
    for (let c = 0; c < nx; c++) {
      let v = Math.round(field.z[plateJ * nx + c] * inv);
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
      gray[r * nx + c] = v;
    }
  }
  const previewPng = encodeGrayPng(nx, ny, gray);

  // Print STL: mirror the relief for front-face-down printing.
  const zStl = p.mirror ? mirrorColumns(field.z, nx, ny) : field.z;
  const grid: HeightGrid = {
    cols: nx - 1,
    rows: ny - 1,
    width: p.widthMm,
    height: p.heightMm,
    z: zStl,
  };
  const triangles = countTriangles(nx - 1, ny - 1);
  const writer = new BinaryStlWriter(triangles);
  emitMesh(grid, writer);
  const stl = writer.finish();

  const report = validateValueGates(field, p, triangles);
  if (!report.ok) {
    throw new Error("Lithophane validation failed: " + report.failures.join("; "));
  }

  return { stl, previewPng, report };
}

export { DEFAULT_LITHOPHANE_PARAMS, PLATE_ASPECT } from "./params";
export type { LithophaneParams } from "./params";

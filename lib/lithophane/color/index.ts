import { DEFAULT_COLOR_PARAMS, type ColorLithophaneParams } from "./params";
import { processImageToColor } from "./image";
import { processImageToContent } from "../image";
import { DEFAULT_LITHOPHANE_PARAMS } from "../params";
import { buildColorFields } from "./pipeline";
import { buildSlab, meshToStl, mergeMeshes } from "./slab";
import { buildThreeMf, type ColorSlabs } from "./threemf";
import { renderColorPreview } from "./preview";

/**
 * Photo → print-ready CMY+White colour lithophane, following Lithophane Maker's
 * method with DUAL RESOLUTION: detail/brightness from a FINE white luminance
 * relief, hue from a COARSE, thin Cyan/Magenta/Yellow band, on a flat white base.
 * Meshing the colour coarsely keeps those parts small; only the relief is fine.
 *
 * Returns a multi-material 3MF (white base+relief = one "white" object), the FIVE
 * per-part STLs (white base, top_white relief, cyan, magenta, yellow — assign by
 * filename, like Lithophane Maker; white.stl and top_white.stl share the white
 * filament), and a predicted colour preview. Deterministic. Throws if the white
 * base isn't a sound solid.
 */
export interface ColorLithophaneResult {
  /** Multi-material 3MF: 4 colour-tinted parts (white = base + relief merged). */
  threemf: Buffer;
  /** Per-part STLs. white + topWhite both print in the WHITE filament. */
  stls: {
    white: Buffer;
    topWhite: Buffer;
    cyan: Buffer;
    magenta: Buffer;
    yellow: Buffer;
  };
  /** Predicted lit appearance. */
  previewPng: Buffer;
  params: ColorLithophaneParams;
  stats: {
    trianglesTotal: number;
    nxv: number;
    nyv: number;
    cnxv: number;
    cnyv: number;
    totalThicknessMm: number;
  };
}

export function generateColorLithophane(
  image: Buffer,
  override?: Partial<ColorLithophaneParams>,
): ColorLithophaneResult {
  const p = { ...DEFAULT_COLOR_PARAMS, ...override };

  // Fine grid (luminance relief) and coarse grid (colour band).
  const fineCols = Math.max(2, Math.round(p.widthMm * p.lithophaneSamplesPerMm));
  const fineRows = Math.max(2, Math.round(p.heightMm * p.lithophaneSamplesPerMm));
  const nxv = fineCols + 1;
  const nyv = fineRows + 1;

  const coarseSpm = p.colorBlockMm > 0 ? 1 / p.colorBlockMm : 1.25;
  const ccols = Math.max(2, Math.round(p.widthMm * coarseSpm));
  const crows = Math.max(2, Math.round(p.heightMm * coarseSpm));
  const cnxv = ccols + 1;
  const cnyv = crows + 1;

  // Colour from a coarse box-averaged sampling; luminance via the proven mono
  // front-end (autocontrast + denoise + gamma) at fine resolution. Both
  // cover-fit/crop the same photo, so they stay aligned.
  const coarseRgb = processImageToColor(image, cnxv, cnyv);
  const { lum } = processImageToContent(image, nxv, nyv, {
    ...DEFAULT_LITHOPHANE_PARAMS,
    gamma: p.gamma,
  });
  const fields = buildColorFields(coarseRgb, lum, nxv, nyv, p);

  // White base = flat box; white relief = fine luminance heightfield on top.
  const baseCeil = new Float32Array(4).fill(p.whiteBaseMm);
  const baseMesh = buildSlab(0, baseCeil, 2, 2, p.widthMm, p.heightMm);
  const reliefMesh = buildSlab(fields.reliefFloor, fields.reliefTop, nxv, nyv, p.widthMm, p.heightMm);
  // For the 3MF the base + relief print in one white filament → one object.
  const whiteMesh = mergeMeshes(baseMesh, reliefMesh);

  // Thin COARSE colour band, each sitting on the one below (shared coarse grid).
  const cyanMesh = buildSlab(p.whiteBaseMm, fields.cyanTop, cnxv, cnyv, p.widthMm, p.heightMm);
  const magentaMesh = buildSlab(fields.cyanTop, fields.magentaTop, cnxv, cnyv, p.widthMm, p.heightMm);
  const yellowMesh = buildSlab(fields.magentaTop, fields.colorTop, cnxv, cnyv, p.widthMm, p.heightMm);

  // The flat white base must be a sound, correctly-wound solid (≈ width·height·
  // base) — catches any winding/geometry regression. Colour slabs may be ~0
  // volume (little of that colorant) but must never be negative (inverted).
  const expectedBase = p.widthMm * p.heightMm * p.whiteBaseMm;
  if (Math.abs(baseMesh.signedVolume - expectedBase) > expectedBase * 0.02) {
    throw new Error(
      `White base volume ${baseMesh.signedVolume.toFixed(1)} mm³ deviates from expected ${expectedBase.toFixed(1)} mm³ — geometry/winding error.`,
    );
  }
  const checkParts = {
    relief: reliefMesh,
    cyan: cyanMesh,
    magenta: magentaMesh,
    yellow: yellowMesh,
  };
  for (const [name, m] of Object.entries(checkParts)) {
    if (m.signedVolume < -1) {
      throw new Error(`Colour part "${name}" has negative volume (${m.signedVolume.toFixed(1)} mm³) — inverted winding.`);
    }
  }

  const slabs: ColorSlabs = {
    white: whiteMesh,
    cyan: cyanMesh,
    magenta: magentaMesh,
    yellow: yellowMesh,
  };
  const threemf = buildThreeMf(slabs);
  const stls = {
    white: meshToStl(baseMesh),
    topWhite: meshToStl(reliefMesh),
    cyan: meshToStl(cyanMesh),
    magenta: meshToStl(magentaMesh),
    yellow: meshToStl(yellowMesh),
  };
  const previewPng = renderColorPreview(fields);

  const trianglesTotal =
    (whiteMesh.triangles.length +
      cyanMesh.triangles.length +
      magentaMesh.triangles.length +
      yellowMesh.triangles.length) /
    3;

  return {
    threemf,
    stls,
    previewPng,
    params: p,
    stats: {
      trianglesTotal,
      nxv,
      nyv,
      cnxv,
      cnyv,
      totalThicknessMm: p.whiteBaseMm + p.colorBandMaxMm + p.maxThicknessMm,
    },
  };
}

export { DEFAULT_COLOR_PARAMS, COLOR_DIMS } from "./params";
export type { ColorLithophaneParams, ColorOrientation } from "./params";

import { DEFAULT_COLOR_PARAMS, type ColorLithophaneParams } from "./params";
import { processImageToColor } from "./image";
import { buildColorFields } from "./pipeline";
import { buildSlab, meshToStl } from "./slab";
import { buildThreeMf, type ColorSlabs } from "./threemf";
import { renderColorPreview } from "./preview";

/**
 * Photo → print-ready CMY+White colour lithophane. Deterministic. Builds the
 * white diffuser base plus three stacked Cyan/Magenta/Yellow solids (each band
 * sits on the one below), returning a multi-material 3MF (for the Bambu AMS),
 * the four per-colour STLs (slicer-agnostic, like Lithophane Maker), and a
 * predicted colour preview PNG. Throws if a slab isn't a valid solid.
 */
export interface ColorLithophaneResult {
  /** Multi-material 3MF: 4 colour-tinted parts for the AMS. */
  threemf: Buffer;
  /** Per-colour STLs (assign to filaments manually if not using the 3MF). */
  stls: { white: Buffer; cyan: Buffer; magenta: Buffer; yellow: Buffer };
  /** Predicted lit appearance. */
  previewPng: Buffer;
  params: ColorLithophaneParams;
  stats: {
    trianglesTotal: number;
    nxv: number;
    nyv: number;
    totalThicknessMm: number;
  };
}

export function generateColorLithophane(
  image: Buffer,
  override?: Partial<ColorLithophaneParams>,
): ColorLithophaneResult {
  const p = { ...DEFAULT_COLOR_PARAMS, ...override };
  const cols = Math.max(2, Math.round(p.widthMm * p.samplesPerMm));
  const rows = Math.max(2, Math.round(p.heightMm * p.samplesPerMm));
  const nxv = cols + 1;
  const nyv = rows + 1;

  const img = processImageToColor(image, nxv, nyv);
  const fields = buildColorFields(img, p);

  const slabs: ColorSlabs = {
    white: buildSlab(0, fields.whiteTop, nxv, nyv, p.widthMm, p.heightMm),
    cyan: buildSlab(fields.whiteTop, fields.cyanTop, nxv, nyv, p.widthMm, p.heightMm),
    magenta: buildSlab(fields.cyanTop, fields.magentaTop, nxv, nyv, p.widthMm, p.heightMm),
    yellow: buildSlab(fields.magentaTop, fields.yellowTop, nxv, nyv, p.widthMm, p.heightMm),
  };

  // The white base must be a sound, correctly-wound solid (≈ width·height·base);
  // this catches any winding/geometry regression. The colour slabs may legitimately
  // be ~0 volume (an image with little of that colorant), but must never be negative
  // (which would mean inverted winding).
  const expectedWhite = p.widthMm * p.heightMm * p.whiteBaseMm;
  if (Math.abs(slabs.white.signedVolume - expectedWhite) > expectedWhite * 0.02) {
    throw new Error(
      `White base volume ${slabs.white.signedVolume.toFixed(1)} mm³ deviates from expected ${expectedWhite.toFixed(1)} mm³ — geometry/winding error.`,
    );
  }
  for (const [name, m] of Object.entries(slabs)) {
    if (m.signedVolume < -1) {
      throw new Error(`Colour slab "${name}" has negative volume (${m.signedVolume.toFixed(1)} mm³) — inverted winding.`);
    }
  }

  const threemf = buildThreeMf(slabs);
  const stls = {
    white: meshToStl(slabs.white),
    cyan: meshToStl(slabs.cyan),
    magenta: meshToStl(slabs.magenta),
    yellow: meshToStl(slabs.yellow),
  };
  const previewPng = renderColorPreview(fields, p);

  return {
    threemf,
    stls,
    previewPng,
    params: p,
    stats: {
      trianglesTotal: (slabs.white.triangles.length / 3) * 4,
      nxv,
      nyv,
      totalThicknessMm: p.whiteBaseMm + 3 * p.maxPerChannelMm,
    },
  };
}

export { DEFAULT_COLOR_PARAMS, COLOR_DIMS } from "./params";
export type { ColorLithophaneParams, ColorOrientation } from "./params";

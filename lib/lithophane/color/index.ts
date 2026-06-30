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
 * method: a flat white diffuser base, a thin COARSE Cyan/Magenta/Yellow band
 * (hue), and a FINE white luminance relief on top (detail + brightness). The
 * white base and relief print in the same filament, so they're emitted as one
 * "white" object. Returns a multi-material 3MF (for the Bambu AMS), the four
 * per-colour STLs (slicer-agnostic, like Lithophane Maker), and a predicted
 * colour preview. Deterministic. Throws if the white base isn't a sound solid.
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
  const cols = Math.max(2, Math.round(p.widthMm * p.lithophaneSamplesPerMm));
  const rows = Math.max(2, Math.round(p.heightMm * p.lithophaneSamplesPerMm));
  const nxv = cols + 1;
  const nyv = rows + 1;

  // Colour at full grid (averaged into coarse blocks inside the pipeline);
  // luminance via the proven monochrome front-end (autocontrast + denoise +
  // gamma). Both cover-fit/crop to the same nxv×nyv grid, so they stay aligned.
  const rgb = processImageToColor(image, nxv, nyv);
  const { lum } = processImageToContent(image, nxv, nyv, {
    ...DEFAULT_LITHOPHANE_PARAMS,
    gamma: p.gamma,
  });
  const fields = buildColorFields(rgb, lum, p);

  // White object = flat base box + the fine luminance relief on top.
  const baseCeil = new Float32Array(4).fill(p.whiteBaseMm);
  const baseMesh = buildSlab(0, baseCeil, 2, 2, p.widthMm, p.heightMm);
  const reliefMesh = buildSlab(fields.colorTop, fields.reliefTop, nxv, nyv, p.widthMm, p.heightMm);
  const whiteMesh = mergeMeshes(baseMesh, reliefMesh);

  // Thin coarse colour band, each sitting on the one below.
  const cyanMesh = buildSlab(p.whiteBaseMm, fields.cyanTop, nxv, nyv, p.widthMm, p.heightMm);
  const magentaMesh = buildSlab(fields.cyanTop, fields.magentaTop, nxv, nyv, p.widthMm, p.heightMm);
  const yellowMesh = buildSlab(fields.magentaTop, fields.colorTop, nxv, nyv, p.widthMm, p.heightMm);

  // The flat white base must be a sound, correctly-wound solid (≈ width·height·
  // base) — catches any winding/geometry regression. Colour slabs may be ~0
  // volume (little of that colorant) but must never be negative (inverted).
  const expectedBase = p.widthMm * p.heightMm * p.whiteBaseMm;
  if (Math.abs(baseMesh.signedVolume - expectedBase) > expectedBase * 0.02) {
    throw new Error(
      `White base volume ${baseMesh.signedVolume.toFixed(1)} mm³ deviates from expected ${expectedBase.toFixed(1)} mm³ — geometry/winding error.`,
    );
  }
  const meshes = { white: whiteMesh, cyan: cyanMesh, magenta: magentaMesh, yellow: yellowMesh };
  for (const [name, m] of Object.entries(meshes)) {
    if (m.signedVolume < -1) {
      throw new Error(`Colour part "${name}" has negative volume (${m.signedVolume.toFixed(1)} mm³) — inverted winding.`);
    }
  }

  const slabs: ColorSlabs = meshes;
  const threemf = buildThreeMf(slabs);
  const stls = {
    white: meshToStl(whiteMesh),
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
      totalThicknessMm: p.whiteBaseMm + p.colorBandMaxMm + p.maxThicknessMm,
    },
  };
}

export { DEFAULT_COLOR_PARAMS, COLOR_DIMS } from "./params";
export type { ColorLithophaneParams, ColorOrientation } from "./params";

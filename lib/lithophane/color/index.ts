import { DEFAULT_COLOR_PARAMS, type ColorLithophaneParams } from "./params";
import { processImageToColor } from "./image";
import { processImageToContent } from "../image";
import { DEFAULT_LITHOPHANE_PARAMS } from "../params";
import { buildColorFields } from "./pipeline";
import { buildSlab, buildReliefMesh, meshToStl, mergeMeshes } from "./slab";
import { buildThreeMf, type ColorSlabs } from "./threemf";
import { renderColorPreview } from "./preview";

/**
 * Photo → print-ready CMY+White colour lithophane, matching Lithophane Maker's
 * decoded structure: a flat white base with a COARSE, thin C/M/Y band EMBEDDED
 * inside it (hue), and a FINE white luminance relief on top with a flat floor
 * (detail/brightness). Embedding the colour keeps the panel ≤ maxThickness; the
 * flat relief floor lets the relief use an efficient flat-back mesh.
 *
 * Returns a multi-material 3MF (all white parts = one "white" object), the FIVE
 * per-part STLs (assign by filename, like Lithophane Maker — white.stl and
 * top_white.stl share the WHITE filament), and a predicted colour preview.
 * Deterministic. Throws if a part isn't a sound solid.
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

  // Fine grid (luminance relief) and coarse grid (embedded colour band).
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

  // White base = a lower box [0, colorInset] + an upper fill/cap [colorTop, base]
  // (so [0, whiteBaseMm] is solid white everywhere except the embedded colour).
  const whiteBelow = buildSlab(0, p.colorInsetMm, 2, 2, p.widthMm, p.heightMm);
  const whiteUpper = buildSlab(fields.colorTop, p.whiteBaseMm, cnxv, cnyv, p.widthMm, p.heightMm);
  // Fine luminance relief, flat floor at whiteBaseMm, efficient flat-back mesh.
  const reliefMesh = buildReliefMesh(fields.reliefTop, nxv, nyv, p.widthMm, p.heightMm, p.whiteBaseMm);

  // Embedded COARSE colour band, each sitting on the one below.
  const cyanMesh = buildSlab(p.colorInsetMm, fields.cyanTop, cnxv, cnyv, p.widthMm, p.heightMm);
  const magentaMesh = buildSlab(fields.cyanTop, fields.magentaTop, cnxv, cnyv, p.widthMm, p.heightMm);
  const yellowMesh = buildSlab(fields.magentaTop, fields.colorTop, cnxv, cnyv, p.widthMm, p.heightMm);

  // The flat lower white box must be a sound, correctly-wound solid
  // (≈ width·height·colorInset) — catches winding/geometry regressions.
  const expectedBelow = p.widthMm * p.heightMm * p.colorInsetMm;
  if (Math.abs(whiteBelow.signedVolume - expectedBelow) > expectedBelow * 0.02) {
    throw new Error(
      `White base box volume ${whiteBelow.signedVolume.toFixed(1)} mm³ deviates from expected ${expectedBelow.toFixed(1)} mm³ — geometry/winding error.`,
    );
  }
  // Relief must be a positive solid (validates the flat-back mesh winding).
  if (reliefMesh.signedVolume <= 0) {
    throw new Error(`Relief volume ${reliefMesh.signedVolume.toFixed(1)} mm³ is not positive — flat-back winding error.`);
  }
  // Colour slabs / upper fill may be ~0 volume but never inverted.
  const parts = { whiteUpper, cyan: cyanMesh, magenta: magentaMesh, yellow: yellowMesh };
  for (const [name, m] of Object.entries(parts)) {
    if (m.signedVolume < -1) {
      throw new Error(`Part "${name}" has negative volume (${m.signedVolume.toFixed(1)} mm³) — inverted winding.`);
    }
  }

  // white.stl = the base white (below + fill/cap); the relief is top_white.stl.
  const whiteBaseSolid = mergeMeshes(whiteBelow, whiteUpper);
  // For the 3MF, all white parts print in one filament → one "white" object.
  const whiteObject = mergeMeshes(whiteBaseSolid, reliefMesh);

  const slabs: ColorSlabs = {
    white: whiteObject,
    cyan: cyanMesh,
    magenta: magentaMesh,
    yellow: yellowMesh,
  };
  const threemf = buildThreeMf(slabs);
  const stls = {
    white: meshToStl(whiteBaseSolid),
    topWhite: meshToStl(reliefMesh),
    cyan: meshToStl(cyanMesh),
    magenta: meshToStl(magentaMesh),
    yellow: meshToStl(yellowMesh),
  };
  const previewPng = renderColorPreview(fields);

  const trianglesTotal =
    (whiteObject.triangles.length +
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
      totalThicknessMm: p.maxThicknessMm,
    },
  };
}

export { DEFAULT_COLOR_PARAMS, COLOR_DIMS } from "./params";
export type { ColorLithophaneParams, ColorOrientation } from "./params";

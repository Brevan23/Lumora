// Geometry + print parameters for the flat lithophane generator. All millimetres.
// One size for now (17x22 cm + 5 mm border); everything is a parameter so adding
// size presets later is trivial.

export interface LithophaneParams {
  /** Relief (image) area width, mm. */
  reliefWidthMm: number;
  /** Relief (image) area height, mm. */
  reliefHeightMm: number;
  /** Flat border width around the relief, mm. */
  borderMm: number;
  /** Thickness at the brightest pixel (thin → lets light through), mm. */
  minThicknessMm: number;
  /** Thickness at the darkest pixel (thick → blocks light), mm. */
  maxThicknessMm: number;
  /** Border ring thickness, mm. */
  borderThicknessMm: number;
  /** Target cell size, mm (smaller = more detail + bigger file). */
  cellMm: number;
  /** Hard cap on grid cells (cols*rows) to bound compute/memory/file size. */
  maxCells: number;
  /** Gamma applied to luminance before the thickness map (1 = linear). */
  gamma: number;
}

export const DEFAULT_LITHOPHANE_PARAMS: LithophaneParams = {
  reliefWidthMm: 170,
  reliefHeightMm: 220,
  borderMm: 5,
  minThicknessMm: 0.8,
  maxThicknessMm: 3.0,
  borderThicknessMm: 3.0,
  cellMm: 0.4,
  maxCells: 600_000,
  gamma: 1.0,
};

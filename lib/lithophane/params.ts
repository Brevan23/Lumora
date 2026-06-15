// Lithophane generation parameters — the validated 5×7 recipe (mm).
// Deterministic: same image + same params → identical STL.

export interface LithophaneParams {
  /** Plate width, mm (5 in). */
  widthMm: number;
  /** Plate height, mm (7 in). */
  heightMm: number;
  /** Thickness at the brightest pixel (thin → most light). */
  minThicknessMm: number;
  /** Thickness at the darkest pixel + the border ring (opaque). */
  maxThicknessMm: number;
  /** Flat constant-thickness frame, mm. */
  borderMm: number;
  /** Extra inset so subjects clear the border, mm. */
  safetyMm: number;
  /**
   * Grid resolution (samples/mm). Default 3/mm (~0.33mm, ~40MB watertight STL).
   * Raise to 4–5/mm for premium detail (larger files — the watertight mesh uses
   * a full back grid, so size ≈ 2× a flat-back mesh at the same resolution).
   */
  samplesPerMm: number;
  /** Midtone darkening for the backlit look. */
  gamma: number;
  /** Gaussian denoise std-dev, px. */
  blurPx: number;
  /** Auto-contrast tail cut, percent per side. */
  autocontrastCutoff: number;
  /** Mirror left↔right for front-face-down printing (print STL only). */
  mirror: boolean;
}

export const DEFAULT_LITHOPHANE_PARAMS: LithophaneParams = {
  widthMm: 127.0, // 5 in
  heightMm: 177.8, // 7 in
  minThicknessMm: 0.8,
  maxThicknessMm: 3.0,
  borderMm: 5.0,
  safetyMm: 2.0,
  samplesPerMm: 3.0,
  gamma: 1.2,
  blurPx: 1.0,
  autocontrastCutoff: 1.0,
  mirror: true,
};

/** Crop aspect (width:height) the customer photo must match: 5:7. */
export const PLATE_ASPECT =
  DEFAULT_LITHOPHANE_PARAMS.widthMm / DEFAULT_LITHOPHANE_PARAMS.heightMm;

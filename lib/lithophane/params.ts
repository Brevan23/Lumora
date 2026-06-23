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
   * Grid resolution (samples/mm). Default 4.7/mm (~0.21mm, premium detail) →
   * ~50MB STL, which fits Supabase's 50MiB per-upload cap. Raise toward 5/mm
   * once the Supabase upload limit is increased; lower for smaller downloads.
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
  samplesPerMm: 4.7,
  gamma: 1.2,
  blurPx: 1.0,
  autocontrastCutoff: 1.0,
  mirror: true,
};

/** Aspect of the legacy 5×7 STL plate. The LIVE customer crop is CROP_ASPECT (4:3)
 *  in lib/constants — this derived value is the STL generator's plate only. */
export const PLATE_ASPECT =
  DEFAULT_LITHOPHANE_PARAMS.widthMm / DEFAULT_LITHOPHANE_PARAMS.heightMm;

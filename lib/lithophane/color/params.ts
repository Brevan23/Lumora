// Color (CMY + White) lithophane parameters, modelled on Lithophane Maker's
// decoded output: a FINE white luminance relief (detail + brightness, like a
// normal lithophane) on top of a flat white base that has a COARSE, thin C/M/Y
// band EMBEDDED inside it (hue). Luminance hi-res + chroma lo-res reads as a
// sharp colour image, and embedding the colour keeps the panel thin (≤ maxThickness).
// Printed on a Bambu AMS (4 filaments). Deterministic: same image+params → same output.

export type ColorOrientation = "portrait" | "landscape";

export interface FilamentSpec {
  /** Slot label shown to the user and written into the 3MF. */
  name: string;
  /** RGB display colour for the slicer (hex, no alpha). */
  hex: string;
}

export interface ColorLithophaneParams {
  /** Plate width, mm. */
  widthMm: number;
  /** Plate height, mm. */
  heightMm: number;
  /**
   * Fine grid resolution (samples/mm) for the WHITE luminance relief — carries
   * the image detail. Lithophane Maker uses 0.25 mm (= 4/mm); the relief uses an
   * efficient flat-back mesh so this stays reasonable despite the fine grid.
   */
  lithophaneSamplesPerMm: number;
  /** Colour block size, mm (~0.8 mm) — chroma is nozzle-limited and coarse. */
  colorBlockMm: number;
  /** Printed layer height, mm — the colour quantisation grid; match the slice setting. */
  layerHeightMm: number;
  /**
   * Flat white diffuser base thickness, mm. The colour band is EMBEDDED inside
   * this base ([colorInsetMm, colorInsetMm+colorBandMaxMm]), and the relief sits
   * flush on top of the base at z = whiteBaseMm. Requires
   * colorInsetMm + colorBandMaxMm ≤ whiteBaseMm.
   */
  whiteBaseMm: number;
  /** Height above the bottom where the embedded colour band starts, mm (white below it). */
  colorInsetMm: number;
  /** Max combined thickness of the embedded C+M+Y colour band, mm (kept thin). */
  colorBandMaxMm: number;
  /**
   * Relief thickness at the brightest pixel (thin → most light), mm. Near 0 so
   * bright areas are genuinely bright — the white base provides the material.
   */
  minThicknessMm: number;
  /** Total panel thickness at the darkest pixel (base + max relief), mm. */
  maxThicknessMm: number;
  /** Midtone gamma for the luminance relief (the backlit look). */
  gamma: number;
  /** Gentle contrast on the colorant amount (1.0 = linear; <1 deepens, >1 lightens). */
  colorGamma: number;
  /** Floor for a non-zero colour channel, in layers. Keep at 1: forcing a higher
   *  floor inflates a colour's weakest channel and washes the hue back to gray. */
  minColorLayers: number;
  /** Mirror left↔right (flip on the first test print if the result is reversed). */
  mirror: boolean;
}

export const DEFAULT_COLOR_PARAMS: ColorLithophaneParams = {
  widthMm: 144,
  heightMm: 108,
  // 4/mm (0.25 mm) matches Lithophane Maker's relief detail; the flat-back relief
  // mesh keeps it ~25 MB despite the fine grid.
  lithophaneSamplesPerMm: 4,
  colorBlockMm: 0.8,
  layerHeightMm: 0.1,
  // 0.8 mm base with colour embedded in [0.2, 0.7] and a 0.1 mm white cap above it;
  // the relief on top maxes the panel at maxThicknessMm (2.7 mm), like the website.
  whiteBaseMm: 0.8,
  colorInsetMm: 0.2,
  colorBandMaxMm: 0.5,
  minThicknessMm: 0.1,
  maxThicknessMm: 2.7,
  gamma: 1.2,
  colorGamma: 1.0,
  minColorLayers: 1,
  mirror: false,
};

/** Frame-sized dimensions per orientation (the 144 × 108 mm Bambu frame). */
export const COLOR_DIMS: Record<
  ColorOrientation,
  { widthMm: number; heightMm: number }
> = {
  portrait: { widthMm: 108, heightMm: 144 },
  landscape: { widthMm: 144, heightMm: 108 },
};

/**
 * Filament stack from the backlight outward: white base (with C/M/Y embedded),
 * then the white relief on top. Display colours are plausible translucent CMYW
 * values — adjust to the actual spools (only affects the slicer tint).
 */
export const FILAMENTS: {
  white: FilamentSpec;
  cyan: FilamentSpec;
  magenta: FilamentSpec;
  yellow: FilamentSpec;
} = {
  white: { name: "Warm White", hex: "#F5F2E8" },
  cyan: { name: "Cyan", hex: "#00AEEF" },
  magenta: { name: "Magenta", hex: "#EC008C" },
  yellow: { name: "Yellow", hex: "#FFF200" },
};

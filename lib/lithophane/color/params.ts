// Color (CMY + White) lithophane parameters, modelled on Lithophane Maker's
// decoded output: a FINE white luminance relief (carries the image's detail and
// brightness, like a normal lithophane) sitting on top of a COARSE, thin C/M/Y
// band (carries hue), over a flat white diffuser base. Luminance hi-res + chroma
// lo-res reads as a sharp colour image. Printed on a Bambu AMS (4 filaments).
// Deterministic: same image + same params → identical output.

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
   * Fine grid resolution (samples/mm) for the WHITE luminance relief — this
   * carries the image detail, so keep it fine (~0.25–0.33 mm). Drives triangle
   * count / file size; Lithophane Maker uses 0.25 mm (= 4/mm).
   */
  lithophaneSamplesPerMm: number;
  /** Colour block size, mm (~0.8 mm) — chroma is nozzle-limited and coarse. */
  colorBlockMm: number;
  /** Printed layer height, mm — the colour quantisation grid; match the slice setting. */
  layerHeightMm: number;
  /** Flat white diffuser base thickness, mm (sits closest to the backlight). */
  whiteBaseMm: number;
  /** Max combined thickness of the C+M+Y colour band, mm (kept thin). */
  colorBandMaxMm: number;
  /** Relief thickness at the brightest pixel (thin → most light), mm. */
  minThicknessMm: number;
  /** Relief thickness at the darkest pixel (opaque), mm. */
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
  // 3/mm (~0.33 mm) balances relief sharpness against file size/serverless
  // memory. Raise toward 4/mm (Lithophane Maker's 0.25 mm) for more detail.
  lithophaneSamplesPerMm: 3,
  colorBlockMm: 0.8,
  layerHeightMm: 0.1,
  whiteBaseMm: 0.4,
  colorBandMaxMm: 0.5,
  minThicknessMm: 0.8,
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
 * Filament stack from the backlight outward: White base, then Cyan, Magenta,
 * Yellow, then the White relief on top. Order is fixed and baked into the
 * geometry + the 3MF material list. Display colours are plausible translucent
 * CMYW values — adjust to the actual spools (only affects the slicer tint).
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

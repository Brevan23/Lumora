// Color (CMY + White) lithophane parameters — the per-pixel subtractive-color
// recipe (white diffuser base + stacked Cyan/Magenta/Yellow), sized to the
// physical 144 × 108 mm frame and printed on a Bambu AMS (4 filaments).
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
   * Colour grid resolution (samples/mm). Colour detail is nozzle-limited
   * (~0.4 mm line), so this stays coarse (~0.7 mm blocks) to keep triangle
   * counts and file size sane. Raise for finer colour at the cost of size.
   */
  samplesPerMm: number;
  /** Printed layer height, mm — the quantisation grid; must match the slice setting. */
  layerHeightMm: number;
  /** Constant white diffuser base thickness, mm (sits closest to the backlight). */
  whiteBaseMm: number;
  /** Max printed thickness of each colour channel (C / M / Y), mm. */
  maxPerChannelMm: number;
  /**
   * Gentle contrast curve applied to the colorant amount (1.0 = linear sRGB
   * mapping, which preserves the image's per-pixel colour variation). Lower
   * (<1) deepens/saturates; higher (>1) lightens. NOT an aggressive linear-light
   * gamma — that collapses midtone-heavy photos into a uniform muddy block.
   */
  gammaBacklight: number;
  /** Minimum printed layers for a colour to register; thinner snaps to 0 or this. */
  minColorLayers: number;
  /** Mirror left↔right (flip on the first test print if the result is reversed). */
  mirror: boolean;
}

export const DEFAULT_COLOR_PARAMS: ColorLithophaneParams = {
  widthMm: 144,
  heightMm: 108,
  samplesPerMm: 1.4, // ~0.7 mm colour blocks
  layerHeightMm: 0.1,
  whiteBaseMm: 0.6,
  // 1.0 mm/channel → 0.6 + 3×1.0 = 3.6 mm total, kept near the ~3.5 mm
  // brightness ceiling for a backlit panel. Raise toward 1.2–1.6 for more
  // colour saturation at the cost of dimming; tune via the first test prints.
  maxPerChannelMm: 1.0,
  gammaBacklight: 1.0,
  minColorLayers: 2,
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
 * Yellow. Order is fixed and baked into the geometry + the 3MF material list.
 * Display colours are plausible translucent CMYW values — adjust to the actual
 * spools (this only affects how the parts are tinted in the slicer preview).
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

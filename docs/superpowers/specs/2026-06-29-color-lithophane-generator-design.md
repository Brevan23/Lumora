# Color Lithophane Generator — Design Spec

- **Date:** 2026-06-29
- **Status:** Draft for review
- **Author:** Claude (with Brevan)
- **Brand:** Illuminate Memories (custom photo lithophanes)

## 1. Summary

Add the ability to generate **full-color (CMY + White) lithophane print files** from a
customer photo, sized exactly to the physical frame (**144 × 108 mm**), output as a
**Bambu AMS-ready 3MF**. Driven from the **admin page** (the only surface for v1),
mirroring the existing monochrome "Generate STL" admin tool. This backs the existing
"Full colour (+$10)" purchase option, which currently has no fulfillment path.

## 2. Background & current state

- The repo already has a **monochrome** lithophane pipeline in TypeScript:
  `lib/lithophane/{image,thickness,mesh,stl,png,params,validate,index}.ts`. It turns a
  photo into a single-material height field (`thickness = min + (max-min)*(1-luminance)`,
  `gamma 1.2`, white = thin, black = thick), emits a binary STL + preview PNG, validates,
  and is invoked both on paid order (`lib/stl-job.ts` → webhook) and via an admin tool
  (`components/admin/AdhocStl.tsx` → `app/api/admin/generate-stl-upload/route.ts`) at
  **144 × 108 mm**, portrait/landscape.
- The admin tool's own copy already names a **"CMYK colour workflow"** as a separate,
  not-yet-built thing. This spec is that workflow.
- **Order option exists, fulfillment doesn't:** orders carry `print_type` (`standard` |
  `color`, `color` is +$10) but there is no color file generator.
- **Verified pain point:** the reference tool the owner uses today
  ([Lithophane Maker — Color Lithophane](https://lithophanemaker.com/Color%20Lithophane.html))
  locks the panel height to `base_length / aspect` unless cropping is enabled, which is
  why the owner "can't change dimensions to fit the frame." Our generator removes that
  constraint by accepting explicit width/height.
- **Printer:** Bambu with an **AMS** (4 filaments), physical frame provides the border
  (matches the mono generator's `borderMm = 0`).

## 3. Goals / Non-goals

**Goals (v1)**
- Generate a color lithophane print file from a photo, sized to 144 × 108 mm,
  portrait or landscape.
- Output a **Bambu AMS multi-material 3MF** with White / Cyan / Magenta / Yellow
  pre-assigned, plus a **color preview image** and a **plain per-color STL + swap guide**
  as a slicer-agnostic fallback.
- Run from the **admin page**, two input sources: ad-hoc photo upload, and pull an
  existing order's photo from Supabase storage.
- Ship **editable color/calibration defaults** so color can be tuned without code changes.

**Non-goals (v1)**
- Auto-generating the color file at checkout / on paid order (planned later).
- Customer-facing color preview on the marketing site.
- Perfect, color-managed accuracy out of the box (requires a calibration print — see §8).
- Reflective (non-backlit) color prints / HueForge-style.

## 4. Chosen approach — "Banded CMYW" (matches the reference tool)

Per the brainstorm, we build the **banded** method (the one Lithophane Maker and the
owner already use), not the heavier per-pixel-independent method:

- A flat **white diffuser base** (constant thickness) sits closest to the backlight.
- Above it, the relief is divided into **fixed height bands** assigned to Cyan, then
  Magenta, then Yellow. Filament changes happen at **3 fixed Z planes** (White→C, C→M,
  M→Y); on the AMS these are **automatic**.
- A **per-pixel relief height** selects how far up the White→C→M→Y stack each pixel
  reaches; the backlight is subtractively filtered by the colored bands it passes
  through (Beer–Lambert), producing color.

**Why this method:** it matches the owner's existing workflow and expectations, prints
cheaply (only 3 automatic AMS swaps, small purge), reuses the existing heightfield→mesh
machinery, and is fast to build. Its known tradeoff (limited gamut + brightness/hue
coupling) is inherent to the technique and identical to what the owner gets today. A
richer per-pixel-independent CMY mode is documented as a future option in §11.

## 5. Color pipeline (per pixel)

Grounded in the transmissive (backlit) subtractive-color physics researched for this spec.

1. **Decode sRGB → linear RGB** (mandatory before any light math):
   `lin = s/12.92 if s ≤ 0.04045 else ((s+0.055)/1.055)^2.4`.
2. **White-balance gains** for the LED (per-channel; default `1,1,1`, set by calibration).
3. **Backlight tone curve:** apply darkening `toned = lin^gamma_b` (default `gamma_b ≈ 2.0`,
   vs `1.2` for the mono relief) so the flooded midtones regain saturation; optional S-curve.
4. **Clamp transmittance** to `[Tmin, 1]` (`Tmin ≈ 0.04`; a finite stack can't reach true black).
5. **Channel densities:** `Dc = -log10(Tr)`, `Dm = -log10(Tg)`, `Dy = -log10(Tb)`
   (Cyan absorbs Red, Magenta Green, Yellow Blue).
6. **Density → thickness:** `t = A⁻¹ · D` where `A` is a 3×3 absorbance-per-mm matrix;
   default `A = diag(k_c, k_m, k_y)` (decoupled) until a fitted matrix from calibration
   replaces it (removes hue shifts).
7. **Clamp** each channel to `tmax_per_channel`, **quantize** to a multiple of `layerHeight`,
   and enforce the min-feature rule (`0 < t < 2·layerHeight` → snap to 0 or 2 layers).

Steps 1–7 give the *target* per-channel densities/thicknesses. **How those are encoded
into geometry is the key decision in §11:** v1 (banded) maps them onto the three fixed
White → C → M → Y height bands (cheaper to print, limited gamut — matches the reference
tool); the future per-pixel-independent mode would print the three thicknesses as
independent stacked layers (fuller color, many more AMS swaps). Band/stack order is fixed
(White → C → M → Y) and baked into both the generator and the calibration swatch either way.

**Default parameters (starting points, all calibration-tunable):**

| Parameter | Default | Notes |
|---|---|---|
| Frame size | 144 × 108 mm | Portrait or landscape; explicit, not aspect-locked |
| `layerHeight` | 0.08 mm | Locked; must match the slice setting |
| `whiteBaseMm` | 0.8 mm | Constant white diffuser |
| `tmax_per_channel` | 1.2 mm | Per C/M/Y band budget |
| `minColorFeatureMm` | 0.16 mm | 2 layers |
| `gamma_b` | 2.0 | Backlight darkening |
| `Tmin` | 0.04 | Black floor |
| `k_c = k_m = k_y` | 1.2 /mm | Density per mm; replace per filament |
| Color order | White → C → M → Y | Fixed |
| Color samples/mm | ~1.6 /mm (~0.6 mm blocks) | Color detail is nozzle-limited; main file-size lever |

## 6. Geometry & output

- **Reuse** the heightfield→watertight-solid approach of `lib/lithophane/mesh.ts`
  (top surface + 4 walls + back), extended to the stacked-band structure.
- **Primary output — Bambu AMS 3MF:** the relief cut into Z-band solids (White base,
  Cyan, Magenta, Yellow), each a separate object assigned to a filament. The 3MF carries
  the logical filament list (type + color) in `project_settings.config` and per-object
  assignment in `model_settings.config`; Bambu auto-maps the 4 logical filaments to the
  loaded AMS slots at send time. Enable a purge/prime tower.
- **Fallback output:** a plain combined **STL** + a **swap guide** (`{layer N, Z mm, color}`),
  derived from cumulative band heights `z_k → N_k = round(z_k / layerHeight)`, for any
  slicer / manual swaps.
- **Preview:** a flattened **color PNG** approximating the lit result, for eyeballing
  before printing (mirrors the mono tool's preview behavior).
- **Orientation/mirroring:** keep the mono pipeline's front-face-down mirror per object.

## 7. Architecture & components

Engine in **Python** (mature libraries + matches the reference implementations), exposed
to the existing Next.js admin.

- **`color-litho/` Python engine** (pure, testable, no web deps):
  - image front-end (Pillow + numpy): EXIF-orient, cover-fit + center-crop to frame,
    channel work — mirrors `lib/lithophane/image.ts`.
  - color pipeline (§5) — vectorized numpy.
  - geometry + writers: per-color heightfield slabs → STL (numpy-stl) and a
    **multi-object 3MF written as plain zip + XML** (no native `lib3mf` dependency, to
    keep the serverless bundle clean) with `<basematerials>` + per-object material refs +
    the Bambu metadata files.
  - calibration profile loader (JSON) for `k` / crosstalk `A` / white-balance / gamma.
  - a CLI entry point for local runs and tests.
- **Invocation from admin:** a **Vercel Python serverless function**
  (`api/generate-color/`) that accepts a photo (multipart) or an order id, runs the
  engine, and streams back the 3MF (+ headers for warnings), exactly like
  `app/api/admin/generate-stl-upload/route.ts` does for mono.
- **Admin UI:** a new component mirroring `components/admin/AdhocStl.tsx` ("Generate
  colour file") with photo upload, portrait/landscape toggle, and a separate path/button
  to generate from an existing order's Supabase photo (reusing `downloadPhoto`).
- **Inputs:** ad-hoc upload (normalized to JPEG client-side like the mono tool) **and**
  an order's `photo_path` from Supabase storage.
- **Output:** browser download of the 3MF (+ optional STL fallback + preview PNG).

## 8. Calibration

- Provide a **swatch-chart generator** (CLI/admin action): C/M/Y ramps + mixes + a gray
  ramp + skin patches on the standard white base, at the production layer height/order.
- The owner prints it once on the real filaments + LED, photographs/measures it, and we
  fit `k`, the 3×3 crosstalk matrix, white-balance gains, and `gamma_b` into the JSON
  profile. Re-tuning = editing the profile, no code change.
- Out of the box (identity profile) the result is "plausible"; post-calibration it's
  accurate. This expectation is set with the owner.

## 9. Data flow

```
admin page
  ├─ upload photo  ──┐
  └─ pick order ─────┤ (Supabase downloadPhoto)
                     ▼
        api/generate-color (Vercel Python fn)
                     ▼
   Python engine: image → color pipeline → banded CMYW slabs
                     ▼
   3MF (AMS) + STL+swap-guide fallback + preview PNG
                     ▼
        streamed back → browser download
```

## 10. Testing & verification

- **Engine unit tests** (pytest): sRGB→linear correctness; density→thickness mapping;
  layer quantization + min-feature snapping; band-height → swap-layer derivation;
  deterministic output (same image + profile → identical bytes).
- **Geometry validation:** watertightness + positive volume per slab (mirror the mono
  `validate.ts` checks), triangle-count/file-size guardrails.
- **3MF validation:** opens in Bambu Studio with 4 objects, 4 filaments assigned, AMS
  auto-maps; sanity-check the produced 3MF parses.
- **End-to-end:** generate from a sample photo at 144 × 108 portrait + landscape; confirm
  download + preview; one real test print + swatch print to validate color and fit.

## 11. Risks & open decisions

- **Gamut / fidelity (key decision to confirm on review):** the banded method limits
  reproducible colors and couples brightness with hue (same as the reference tool). If
  richer color is wanted later, a **per-pixel-independent CMY** mode gives fuller color at
  the cost of many automatic AMS swaps (much longer prints + heavy purge + larger files).
  v1 = banded; per-pixel = documented future option.
- **Color accuracy needs calibration** (§8) — out-of-box is approximate.
- **Vercel Python runtime:** adds a Python serverless function to a currently all-TS
  project. numpy/Pillow are supported; 3MF is written without native deps. Validate
  cold-start, memory, and the 3MF on the target Bambu Studio version. If serverless
  proves awkward, fall back to running the engine as a local CLI the owner invokes.
- **Print cost:** even banded color uses more time + filament (purge) than mono; relevant
  to the +$10 pricing.
- **File size:** keep the color sample grid coarse (~0.6 mm blocks) and prefer 3MF
  (indexed + zipped) to stay well under upload/transfer limits.

## 12. Success criteria

- From the admin page, a photo (uploaded or from an order) produces a Bambu-AMS 3MF at
  144 × 108 mm that slices with White/C/M/Y auto-assigned and prints a recognizable,
  correctly-framed color lithophane.
- The owner can re-tune color via the calibration profile without code changes.
- Output is deterministic and validated (watertight, sane size).

## 13. References

- Lithophane Maker — Color Lithophane (reference tool): https://lithophanemaker.com/Color%20Lithophane.html
- Bambu Lab — CMYK color lithophane instructions: https://wiki.bambulab.com/en/knowledge-sharing/CMYK-color-lithophane-printing-instructions
- Bambu Lab — Standard 3MF color parsing: https://wiki.bambulab.com/en/bambu-studio/Standard-3MF-File-Color-Parsing
- `adamwespiser/image-to-stl` (Python CMY+white reference): https://github.com/adamwespiser/image-to-stl
- `gaugo87/PIXEstL` (palette/AMS instruction reference): https://github.com/gaugo87/PIXEstL
- `colbrydi/Lithophane` (numpy + numpy-stl meshing): https://github.com/colbrydi/Lithophane
- Existing monochrome pipeline: `lib/lithophane/*`, `lib/stl-job.ts`, `components/admin/AdhocStl.tsx`

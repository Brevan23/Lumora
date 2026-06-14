# Lithophane STL Converter — Design Spec

- **Date:** 2026-06-14
- **Status:** Approved design → implementing
- **Builds on:** `2026-06-13-lithophane-store-mvp-design.md`

## Goal

Turn a paid order's stored photo into a printable `.stl` lithophane, **on demand
from `/admin`**. Pure deterministic geometry (no AI). The customer-facing store
is unchanged.

## Locked decisions

| Decision | Choice |
|---|---|
| Stack | **Node/TypeScript** (no Python) — `sharp` for image decode/resize; a small hand-written binary-STL encoder |
| Trigger | **On-demand** — a "Generate STL" button per paid order in `/admin` |
| Geometry | **Flat panel + 5 mm raised border**, one size: 17×22 cm |
| Multi-size | **Deferred** — generator is parameterized so presets are a small follow-up |

## Lithophane model

- **Footprint:** 170 × 220 mm relief area + a **5 mm** flat border at max thickness → **180 × 230 mm** outer.
- **Thickness map (backlit convention):** brighter pixel → thinner (more light); darker → thicker (blocks light). `thickness = tMin + (1 − L^gamma)·(tMax − tMin)`, default **tMin 0.8 mm**, **tMax 3.0 mm**, gamma 1.0 (tunable).
- **Mesh:** a single watertight heightmap solid over the full footprint — varying-thickness **top** surface (relief inside, flat `tBorder = 3 mm` on the border ring), flat **bottom** at z=0, and 4 **walls**. Bottom is a full grid matching the top so the mesh is manifold with no T-junctions.
- **Resolution:** ~**0.4 mm/cell** (tunable), capped (`maxCells ≈ 600k`) so the mesh stays printer- and server-friendly (~1 M triangles, ~50 MB **binary** STL).

## Architecture

- `lib/lithophane/params.ts` — `LithophaneParams` + defaults.
- `lib/lithophane/heightmap.ts` — `sharp`: auto-orient → grayscale → resize → raw luminance grid.
- `lib/lithophane/mesh.ts` — heightmap grid → triangles (top/bottom/walls), `countTriangles()`.
- `lib/lithophane/stl.ts` — `BinaryStlWriter`: pre-allocates, computes per-triangle normals, writes 80-byte header + count + 50-byte triangles; asserts the final count.
- `lib/lithophane/index.ts` — `generateLithophaneStl(imageBuffer, override?) → Buffer`.
- `app/api/admin/generate-stl/route.ts` — Node runtime, **auth-gated** (admin cookie), `maxDuration = 300`; loads order → downloads photo → generates STL → uploads → saves `stl_path` → returns a signed download URL.
- Storage: new **private bucket `lithophane-stl`** (100 MB limit, no MIME restriction) + `stl_path text` column on `orders`. SQL in `supabase/schema.sql` (with `alter table … add column if not exists`).
- `components/admin/StlButton.tsx` + `AdminTable` column: Generate STL → Download STL (+ Regenerate).
- New dep: **`sharp`** (Vercel-supported; already used by Next image optimization).

## Verification

- `next build` clean.
- A throwaway `npx tsx` script generates an STL from a synthetic gradient and **validates the binary**: triangle count matches the formula, mesh is **watertight/manifold** (every undirected edge used exactly twice; directed edges unique → consistent winding), **signed volume > 0**, and bounding box ≈ 180 × 230 × 3 mm.
- Adversarial code-review pass.

## Out of scope (deferred)

Customer-facing size selection, multiple aspect ratios, curved panels, auto-generation on payment. Generator already accepts size/border/thickness/resolution params, so presets are a small change.

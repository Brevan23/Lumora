# Frame Preview + Orientation Toggle — Design

**Date:** 2026-06-22
**Status:** Draft for review
**Context:** Lumora / Illuminate Memories — custom photo lithophane store. The
product moved to Bambu's CMYK frame (144 × 108 mm, 4:3). This spec adds (1) a
customer-chosen **orientation toggle** and (2) an **AI-assisted "see your photo
lit up in the frame" preview** that also produces an image for email marketing.

---

## Goals

- Let the customer choose **Portrait (default)** or **Landscape** for their
  lithophane, with a simple toggle in the crop step. Both are 4:3, just rotated
  (Portrait = 3:4 ≈ 0.75, Landscape = 4:3 ≈ 1.333).
- Record the chosen orientation on the order and show it in `/admin` so
  fulfillment generates the STL the right way up.
- After cropping, show the customer their **actual photo, lit up inside the
  frame**, instantly and at no per-customer cost.
- Reuse the same renderer server-side to produce a framed-preview image per
  order, usable in marketing emails.

## Non-goals (YAGNI for now)

- Video reveals; lifestyle/room scenes (dark glowing backdrop only).
- The cookie-consent banner, email capture, and send automation — that is a
  separate phase-2 marketing system. This feature only *produces the image* it
  will later use.
- Automatic photo→STL conversion in any new orientation (color STLs are
  generated manually in Make My Lithophane for now).

## Key decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Orientation default | **Portrait (3:4)**; toggle to Landscape (4:3) |
| Who chooses | The **end customer**, in the crop step |
| Record orientation | **Yes** — stored on the order, shown in `/admin` |
| AI handling of the photo | **Keep photo pixel-exact**; AI builds the frame/scene only |
| Frame setting | **Frame on a dark amber-glow backdrop** (on-brand) |
| Per-customer AI calls | **None** — compositing is deterministic; AI only makes the reusable backplates |
| Output | Still image |

---

## Architecture overview

Two reusable **backplate** images (one Portrait, one Landscape) are generated
*once* via Higgsfield: the lit frame on a dark glowing backdrop, with the photo
area left as a transparent 4:3 window. Per customer, we composite their exact
cropped photo into that window with a "backlit" transform — in the browser for
the instant on-site preview, and server-side (`sharp`) for the email image.
Both renderers read the **same backplate asset + the same transform settings**,
so the on-site and email images match.

```
Customer crops (orientation toggle) ──► cropped JPEG (3:4 or 4:3)
        │                                      │
        ▼                                      ▼
  FramePreview (browser canvas)         /api/checkout (orientation in metadata)
   backplate[orient] + transform               │
        │                                       ▼
        ▼                              Stripe ─► /api/webhook ─► orders.orientation
  instant lit-in-frame preview                  │
                                                ▼
                                   server render (sharp) ─► framed preview PNG
                                   in storage ─► URL for marketing email
```

## Components

### 1. Orientation toggle (crop step) — *no external dependency, can ship first*
- `lib/constants.ts`: replace the single `CROP_ASPECT` with
  `CROP_ASPECT_PORTRAIT = 3 / 4`, `CROP_ASPECT_LANDSCAPE = 4 / 3`, and
  `DEFAULT_ORIENTATION = "portrait"`. Add an `Orientation = "portrait" |
  "landscape"` type.
- `UploadSection.tsx`: hold `orientation` in state (default portrait). Add a
  **Portrait ⇄ Landscape** toggle button in the crop modal; the `Cropper`
  `aspect` derives from it. The crop box and the "photo ready" thumbnail use the
  matching `aspect-[3/4]` / `aspect-[4/3]`.
- Frame-size copy reads the orientation (e.g. "10.8 × 14.4 cm, portrait" /
  "14.4 × 10.8 cm, landscape").
- **Note:** production currently defaults to Landscape (shipped earlier today);
  implementing this flips the default to Portrait.

### 2. Order records orientation
- `supabase/schema.sql`: `alter table public.orders add column if not exists
  orientation text not null default 'portrait';`
- `/api/checkout`: include `orientation` in the Stripe Checkout Session
  `metadata` (validated against the two allowed values; default portrait).
- `/api/webhook`: write `orientation` from session metadata onto the order row.
- `AdminTable.tsx`: show an **Orientation** value ("Portrait" / "Landscape") per
  order; the thumbnail uses the matching aspect.

### 3. Backplate asset (the Higgsfield part)
- Two PNGs: `frame-portrait.png`, `frame-landscape.png` (committed to
  `/public`). Each is the lit frame on a dark amber-glow backdrop with the photo
  area as a transparent rectangle.
- A small manifest describes each: `{ src, photoWindow: { x, y, w, h } }` in
  CSS-pixel space of the backplate.
- v1 generated via Higgsfield; refined/swapped when the real empty-frame photo
  arrives. A committed **fallback backplate** ships so the feature works even
  before the Higgsfield key exists.

### 4. Backlit transform (shared)
- `lib/preview/transform.ts`: tunable settings applied to the customer photo so
  it reads as lit-from-behind — warm tint, brightness lift, soft bloom, gentle
  contrast, optional vignette. One module, imported by both renderers, so the
  look is identical on-site and in email.

### 5. On-site preview (browser)
- `FramePreview` component: a `<canvas>` that draws `backplate[orientation]`,
  then the transformed cropped photo into `photoWindow`, reusing the existing
  `glow-card` styling for the surrounding glow. Renders automatically after the
  crop is confirmed, in place of / alongside the current "photo ready"
  thumbnail. No network call, instant, free.

### 6. Email image (server)
- A server helper (`lib/preview/render.ts`, `sharp`) composites the stored
  cropped photo into `backplate[orientation]` with the same transform, writes a
  PNG to Supabase storage, and returns its URL. Invoked from the order flow
  (e.g. after payment) so each order has a ready-to-use framed image.

### 7. Higgsfield boundary
- `lib/higgsfield.ts`: thin server-side client. Key in a Vercel env var
  (`HIGGSFIELD_API_KEY`), never exposed to the browser. Used **only** to
  generate/refresh backplates via an **admin-triggered** action — never per
  customer. Exact endpoints/fields confirmed at build time (their public docs
  page is currently a redirect stub).

## Data flow / orientation propagation

`orientation` originates in the crop UI → sent to `/api/checkout` → stored in
Stripe session metadata → read by `/api/webhook` → written to
`orders.orientation` → displayed in `/admin` and used to pick the backplate for
the server-rendered email image. The cropped image's own dimensions also encode
orientation (wide vs tall) as a redundant signal.

## Error handling / fallback

- Any preview render failure → fall back to the plain cropped thumbnail. The
  preview is never on the checkout critical path; **checkout never blocks** on it.
- Higgsfield unavailable / key unset → use the committed fallback backplate.
- `orientation` missing/invalid anywhere → default to `portrait`.

## Suggested phasing

1. **Orientation toggle + order recording + admin** (no external dependency).
2. **On-site preview** using the committed fallback backplate + transform.
3. **Higgsfield backplate generation** (needs the API key) to replace the
   fallback with polished art; then the **email render**.

## Resources needed from the user

- **Higgsfield API key** (for phase 3) — set as `HIGGSFIELD_API_KEY` in Vercel.
- **Photo of the real empty frame** (optional) — to refine the backplates;
  until then we use a stylized/AI stand-in.

## Open items (resolved at build time)

- Exact Higgsfield endpoint paths, request/response shape, and credit cost per
  backplate generation.
- Final `photoWindow` rectangles, measured from the chosen backplate art.
- Transform settings tuned visually against a few sample photos.

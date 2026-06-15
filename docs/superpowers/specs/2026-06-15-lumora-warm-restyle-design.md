# Lumora Warm Restyle — Design Spec

**Date:** 2026-06-15
**Status:** Approved (design approved by user; ready to implement)
**Scope:** Customer-facing landing page (`/`) + success page (`/success`). Admin inherits new color tokens only — no layout rework.

## 1. Goal

Make the Lumora store feel significantly more premium while keeping its existing warm, handcrafted identity. The primary lever is **soft, warm motion**; the secondary lever is **visual polish** (type, depth, rhythm). This is a *polish + motion* pass, not a restructure — section order and content flow stay the same.

Inspiration: the *technique* of superpower.com's motion and depth (from `DESIGN_ANALYSIS.md`), translated into Lumora's warm palette. We are **not** adopting superpower's colors or copy.

## 2. Non-goals (YAGNI)

- No recolor away from ivory/amber/espresso.
- No restructuring of hero or sections; no new content/copy.
- No changes to order/upload logic, Stripe checkout, or the STL/email backend.
- No admin dashboard layout redesign (colors inherit from tokens).
- No announcement/promo bar (explicitly deferred unless requested later).

## 3. Palette & tokens (keep warm, elevate)

Keep the existing color names and values; refine and extend rather than replace:

- Base: `ivory #FBF7F0`, `ink #1E1B16`, `espresso #16120E`, neutrals `sand/muted/line`.
- Accent: `amber` family (`#E0A140` / soft `#EBC07E` / deep `#C7842A`).
- **Add warm-tinted shadows** (a hint of espresso, never cold gray):
  - `soft`: small ambient, e.g. `0 1px 2px rgba(30,27,22,.05), 0 8px 24px -12px rgba(30,27,22,.14)`
  - `lift`: hover/elevated (extend existing `lift`)
  - `glow-amber`: warm accent glow for primary CTAs, e.g. `0 6px 20px -6px rgba(224,161,64,.45)`
- **Add a section-tint** token for subtle ivory↔sand alternation.
- Refine the **type scale** in Tailwind (display sizes a touch larger + tighter tracking for Fraunces; tuned line-heights). Keep Fraunces (display) + Inter (body).
- Replace/soften existing keyframes (`glowdrift`, `glowpulse`) timing to be slower and gentler.

## 4. Motion system (the centerpiece)

Add `framer-motion`. Build a small reusable kit and apply it consistently. Everything respects `prefers-reduced-motion` (via `useReducedMotion`): reveals become immediate (no transform), the header still resizes but without spring overshoot.

### 4.1 Reveal primitive — `components/site/motion/Reveal.tsx`
- `whileInView` fade + rise: `opacity 0→1`, `y 20px→0`.
- Duration ~0.7s, ease `[0.22, 1, 0.36, 1]` (warm ease-out), `viewport={{ once: true, margin: "-80px" }}`.
- Optional `delay` prop and a `RevealGroup`/stagger helper (staggerChildren ~0.08–0.12s) for card grids, gallery, FAQ rows.
- Replaces the static `.animate-fade-up` usage.

### 4.2 Growing top bar — rework `components/site/Header.tsx`
Direction-aware, continuously morphing sticky header (replaces today's binary transparent→solid-at-70% logic).
- **At top (over hero):** tall + airy (generous vertical padding), transparent background, light text, larger brand.
- **Scrolling down:** eases shorter/denser; gains `bg-ivory/85` + `backdrop-blur` + hairline border + soft shadow; text → ink; brand scales down slightly.
- **Scrolling up:** **smoothly grows** back toward the tall/airy form (height, padding, brand scale spring back) — soft, warm, no snap.
- Implementation: Framer Motion `useScroll` + a `useScrollDirection` hook (track last scroll Y + a small threshold to avoid jitter). Animate via a `motion.header` with spring transition (gentle, low stiffness, no/low bounce). At scrollY≈0 always force the full/airy state regardless of direction.
- Accessibility: header remains keyboard-reachable; nav links unchanged; reduced-motion disables the spring (instant size change).

### 4.3 Micro-interactions
- Buttons: soft hover (scale ~1.02 + `shadow-glow-amber`), gentle active press; smooth color transitions.
- Cards (GlowFrame, How-it-Works, Upload, FAQ rows): gentle hover lift (translateY -2–4px + `shadow-lift`).
- Hero glows: keep drifting, slower/softer timing.
- FAQ accordion: animate open/close height smoothly (Framer `AnimatePresence`/height auto) instead of instant toggle.

## 5. Visual polish per surface
- **Type:** larger, slightly tighter Fraunces display headings; calmer Inter body with tuned leading; apply `text-balance`/`text-pretty` where it helps.
- **Depth:** apply the warm layered shadows + consistent larger radii across cards/buttons/modal; tasteful `backdrop-blur` on the nav and the crop modal overlay.
- **Rhythm:** subtle ivory↔sand alternating section backgrounds for separation (no hard dark/light flips). Hero stays espresso.
- **Cards & buttons:** unify radii/borders/shadows; refine `.btn-primary` (warm amber + soft glow), `.btn-secondary`, `.btn-ghost-light`.

## 6. Files

**Add:** `framer-motion` dependency; `components/site/motion/Reveal.tsx` (+ stagger helper); `lib/useScrollDirection.ts` (or co-located hook).

**Edit:** `tailwind.config.ts` (tokens: shadows, type scale, keyframe timing), `app/globals.css` (button/card/eyebrow classes, base, section-tint util), `app/layout.tsx` (font tuning if needed), `components/site/Header.tsx` (growing bar), `Hero.tsx`, `HowItWorks.tsx`, `Gallery.tsx`, `UploadSection.tsx`, `Faq.tsx`, `Footer.tsx`, `TrustStrip.tsx`, `GlowFrame.tsx`, `app/page.tsx`, `app/success/page.tsx`.

**Untouched:** upload/crop/checkout logic, STL/email backend, admin layout (colors inherit).

## 7. Acceptance criteria
- `npm run build` passes; no TypeScript/lint errors.
- Header grows/shrinks smoothly with scroll direction; full/airy at the very top; legible (solid + blur) when condensed.
- Major sections/elements reveal softly on scroll once; grids/lists stagger.
- Buttons/cards have soft warm hover states; FAQ animates open/close.
- `prefers-reduced-motion` disables transforms/springs gracefully.
- Palette unchanged in spirit (warm); overall reads clearly more premium than before.
- Build deploys to Vercel production and the live site reflects the changes.

## 8. Implementation order
1. **Foundation:** add framer-motion; tokens in `tailwind.config.ts` + `globals.css`; motion kit (`Reveal`, scroll-direction hook).
2. **Header:** the growing top bar.
3. **Per-section polish + reveals:** Hero → HowItWorks → Gallery → UploadSection → Faq → Footer → TrustStrip/GlowFrame → success page.
4. **Verify:** local build, reduced-motion check, then deploy.

*Note: this project is not a git repository, so the spec is saved but not committed.*

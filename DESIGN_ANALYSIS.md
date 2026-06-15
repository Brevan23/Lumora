# Design System Analysis — extracted from superpower.com

> A reusable design **language** for Next.js 14 + Tailwind + Framer Motion, reverse-engineered from a live premium product site. This documents *techniques and tokens*, not their content — no copy, images, logos, or branding are reproduced. Replace every value with your own brand and you keep the feel.
>
> **How this was produced:** the live HTML + the 1.6 MB Webflow stylesheet + fonts were pulled with `curl`; a headless Chromium (Playwright) loaded the page to read *computed* styles and capture full-page screenshots at 1440 px and 390 px (see `design-screenshots/`); the JS stack was identified from the loaded libraries. All token values below are real, pulled from CSS custom properties and verified against computed styles.

---

## 1. Overview & Design Philosophy

The aesthetic is **clinical-premium through restraint**. A near-monochrome neutral system (the Tailwind *zinc* scale) carries ~95% of every screen, and a *single* warm accent — vermillion `#fc5f2b` — does all the emphasis; nothing competes with it. The "expensive" feel comes from a few deliberate choices repeated everywhere: **large headings set at *regular* weight (400) with tight negative letter-spacing**, small muted body copy, oversized stat numbers, very generous whitespace, soft low-opacity layered shadows, fully-rounded pills and large soft card radii, and motion that is *quiet* — scroll-reveals, drifting WebGL gradient "glows," and split-text headline entrances rather than anything bouncy. Rhythm across the long scroll comes from punctuating the white flow with full-bleed **dark `zinc-900` sections**, so the page reads as a sequence of calm "rooms" rather than a template.

**The five things doing the heavy lifting** (expanded in §5): one accent over a zinc neutral ramp · oversized type at light weight + tight tracking · alternating light/dark full-bleed surfaces · soft layered shadows + huge backdrop-blur for depth · understated scroll-reveal + drifting-gradient motion.

The stack it ships on (for reference): **Webflow** + **GSAP 3.15** (`ScrollTrigger`, `SplitText`, `Flip`, `Observer`, `CustomEase`), **Swiper** carousels, **UnicornStudio** (WebGL shader backgrounds — the glowing blobs), **Plyr + hls.js** (hero video), and **Klaviyo** (exit-intent/referral popups). You can reproduce the *language* of all of it with Framer Motion + a CSS gradient/blur approximation; you do not need WebGL.

---

## 2. Design Tokens

The token system is two layers: a **primitive palette** (a zinc neutral ramp + one brand ramp + a few neon accents) and a **semantic layer** (`background-*`, `text-*`, `border-*`) that maps roles onto primitives. Build your own the same way — it's what lets you flip a section to "dark" by swapping the semantic vars, not the components.

### 2.1 Tailwind theme extension

```js
// tailwind.config.ts → theme.extend
export default {
  theme: {
    extend: {
      colors: {
        // Neutral ramp — carries the whole page (this IS Tailwind's zinc)
        zinc: {
          50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8',
          400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46',
          800: '#27272a', 900: '#18181b',
        },
        // Brand accent — "vermillion" (swap for your own hue, keep the ramp shape)
        brand: {
          50: '#fff6ea', 100: '#ffedd5', 300: '#fed7aa',
          500: '#fdba74', 700: '#f7861e', 900: '#fc5f2b', // 900 is THE accent
        },
        // Neon accents — use *one at a time*, tiny doses (chart dots, badges)
        neon: { green: '#00fca1', greenDeep: '#11c182', pink: '#ff68de', yellow: '#e8fc00' },
      },
      fontFamily: {
        // Primary neo-grotesque. NB International Pro is licensed (Neubau) —
        // license it OR substitute a free near-grotesque: Inter Tight / Geist /
        // Hanken Grotesk / "Söhne" if licensed.
        sans: ['"NB International Pro"', 'Inter Tight', 'Inter', 'Arial', 'sans-serif'],
        mono: ['"NB International Pro Mono"', 'ui-monospace', 'monospace'],
        // Accent script — Square Peg is free on Google Fonts.
        script: ['"Square Peg"', 'cursive'],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }] — note the TIGHT negative tracking
        stat:  ['4.375rem', { lineHeight: '1',    letterSpacing: '-0.03em'   }], // 70px
        h1:    ['3.75rem',  { lineHeight: '1',    letterSpacing: '-0.02em'   }], // 60px
        h2:    ['3rem',     { lineHeight: '1.2',  letterSpacing: '-0.0225em' }], // 48px
        h3:    ['2rem',     { lineHeight: '1.25', letterSpacing: '-0.02em'   }], // 32px
        h4:    ['1.5rem',   { lineHeight: '1.3',  letterSpacing: '-0.025em'  }], // 24px
        h6:    ['1.25rem',  { lineHeight: '1.4',  letterSpacing: '-0.0125em' }], // 20px
        lead:  ['1.25rem',  { lineHeight: '1.4',  letterSpacing: '-0.005em'  }], // 20px lede
        base:  ['1rem',     { lineHeight: '1.5'                              }], // 16px
        body:  ['0.875rem', { lineHeight: '1.5'                              }], // 14px (default body!)
        caption:['0.75rem', { lineHeight: '1.4'                             }], // 12px, muted
      },
      borderRadius: {
        xxs: '0.25rem', xs: '0.375rem', sm: '0.5rem', md: '0.625rem',
        lg: '0.75rem', xl: '1rem', '2xl': '1.25rem', '3xl': '1.5rem',
        '4xl': '2.5rem', full: '9999px',
      },
      boxShadow: {
        // soft, low-opacity, LAYERED — never a single hard drop shadow
        xs:     '0 1px 2px rgb(0 0 0 / 0.05)',
        sm:     '0 2px 8px rgb(0 0 0 / 0.10)',
        card:   '0 4px 4px rgb(0 0 0 / 0.10), 0 16px 24px rgb(0 0 0 / 0.10)',
        ambient:'0 2px 320px rgb(0 0 0 / 0.05)',           // huge soft halo behind hero art
        glow:   '0 4px 10px rgb(252 95 43 / 0.16)',        // accent glow under primary CTAs
      },
      backdropBlur: { glass: '12px', heavy: '100px', blob: '139px' },
      maxWidth: { container: '80rem', prose: '45rem', card: '30rem' }, // 1280 / 720 / 480
      spacing:  { navbar: '6rem' },
    },
  },
}
```

### 2.2 CSS custom properties (semantic layer + dark-surface flip)

```css
:root {
  /* primitives */
  --zinc-50:#fafafa; --zinc-100:#f4f4f5; --zinc-200:#e4e4e7; --zinc-300:#d4d4d8;
  --zinc-400:#a1a1aa; --zinc-500:#71717a; --zinc-700:#3f3f46; --zinc-900:#18181b;
  --brand-900:#fc5f2b; --brand-700:#f7861e; --brand-500:#fdba74; --brand-100:#ffedd5;

  /* semantic — ROLES, not colors. Components only ever read these. */
  --bg-primary:#ffffff;
  --bg-secondary:var(--zinc-50);
  --bg-tertiary:var(--zinc-100);
  --bg-alternate:var(--zinc-900);          /* the dark full-bleed sections */
  --surface:#ffffff;
  --text-primary:var(--zinc-900);
  --text-secondary:var(--zinc-500);        /* muted body / captions */
  --text-accent:var(--brand-900);
  --border-primary:var(--zinc-200);
  --border-secondary:var(--zinc-300);
  --ring:var(--brand-900);

  --radius-card:var(--radius, 1rem);
  --navbar-height:6rem;
}

/* Flip any section to dark by swapping the semantic vars — components don't change. */
[data-surface="dark"] {
  --bg-primary:var(--zinc-900);
  --surface:#27272a;                       /* zinc-800 cards on dark */
  --text-primary:#ffffff;
  --text-secondary:var(--zinc-400);
  --border-primary:#3f3f46;                /* zinc-700 */
}
```

### 2.3 Value reference (pulled from the live CSS / computed styles)

| Role | Token | Value |
|---|---|---|
| Page background | `bg-primary` | `#ffffff` |
| Alt surface | `bg-secondary` / `bg-tertiary` | `#fafafa` / `#f4f4f5` |
| Dark section | `bg-alternate` | `#18181b` (zinc-900) |
| Text primary / muted | `text-primary` / `text-secondary` | `#18181b` / `#71717a` |
| **Accent** | `brand-900` | **`#fc5f2b`** (the *only* loud color) |
| Border | `border-primary` | `#e4e4e7` (zinc-200) |
| Heading font / weight | `font-sans` | NB International Pro, **weight 400** |
| H1 | — | 3.75rem · lh 1 · tracking **-0.02em** |
| Body default | `text-body` | **0.875rem** (14px) · lh 1.5 |
| Big stat number | `text-stat` | 2.5–4.375rem · tracking -0.03em |
| Radii | `lg` / `xl` / `4xl` / `full` | .75rem / 1rem / 2.5rem / pill |
| Card shadow | `shadow-card` | `0 4px 4px /.1, 0 16px 24px /.1` |
| Accent glow | `shadow-glow` | `0 4px 10px #fc5f2b29` |
| Backdrop blur | `blur-glass` … `blur-heavy` | 12px … 100–139px |
| Container | `max-w-container` | 80rem (1280px); text col ~45rem |

**Why these specific choices read as premium:** the body default is *small* (14px) and *muted* (zinc-500), which makes the oversized headings feel even larger; headings are **regular weight**, not bold, so they read as confident rather than shouty; **everything** has slightly negative tracking; and there is exactly **one** saturated color on the page. Restraint is the system.

---

## 3. Interaction Pattern Specs

*Each pattern below follows the same shape: **what it does · how it's triggered · timing/easing · how to rebuild it in Next.js 14 + Tailwind + Framer Motion** (with a snippet where the pattern is non-obvious). Techniques only — no copy or assets are reproduced.*

---

### 3.1 — Hero, video background, gradient blobs & light/dark section blending

### HERO SECTION STRUCTURE

**HTML Markup Overview**
The hero (`section_sp2-home-hero`) uses a three-part layout:
- **Content layer** (`.sp2-home-hero_content`): Badge, h1 headline split into `<span>` elements, subheading paragraph, button group
- **Video background** (`.sp2-hero_bg-video`): Full-viewport background video container
- **Wrapper** (`.section_sp2-home-hero-inner`): flex layout with `justify-content: space-between`, `height: calc(100dvh - 48px)` (navbar offset), `position: relative; overflow: hidden`

**CSS Dimensions**
```
.section_sp2-home-hero {
  height: 80dvh (desktop) | calc(100dvh - 48px) (mobile);
  min-height: 50rem;
  display: flex;
  flex-flow: column;
  position: relative;
  overflow: hidden;
  padding: 0.5rem;
  border-radius: 0.75rem;  /* Subtle corner radius */
}
```

---

### VIDEO BACKGROUND (PLYR + HLS.JS)

**Live Video Implementation**
- **Player**: Plyr 3.x (cdn.jsdelivr.net) with HLS.js for HLS/m3u8 streaming
- **Markup Pattern**:
```html
<div class="sp2-hero_bg-video">
  <div 
    data-vc-no-loop=""
    data-src="https://[cdn]/playlist.m3u8"
    data-type="hls"
    data-plyr-card="1"
    data-disable-dblfullscreen="1"
    data-vc-bg=""
    class="video-card is-events-none">
    <img 
      class="image_cover-absolute1"
      src="[poster-first-frame.avif]"
      alt="" />
  </div>
</div>
```

**Data Attributes & Behavior**
- `data-vc-bg=""`: Marks this as a background video (full-viewport, lower event priority)
- `data-vc-no-loop=""`: Video plays once (no continuous looping)
- `data-plyr-card="1"`: Plyr card instance
- `data-disable-dblfullscreen="1"`: Disables double-click fullscreen (good for backgrounds)
- `data-type="hls"`: Tells Plyr to use HLS.js loader
- `is-events-none`: CSS class sets `pointer-events: none` (video doesn't interfere with foreground text)
- Poster image fallback (AVIF format with srcset for responsive sizes)

**CSS for Video Container**
Video card is absolutely positioned behind content with `z-index: 1` or lower, allowing text/buttons to sit on top. The container uses `overflow: hidden` to clip content to rounded corners and prevent video edges from showing.

---

### HEADLINE REVEAL ANIMATION (GSAP SPLITTEXT)

**Setup: GSAP Plugins Loaded**
```html
<script src="https://cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js"></script>
<script src="https://cdn.prod.website-files.com/gsap/3.15.0/SplitText.min.js"></script>
<script src="https://cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js"></script>
<!-- ... TextPlugin, CustomEase, EasePack registered -->
<script>
gsap.registerPlugin(ScrollTrigger, Flip, CustomEase, EasePack, Observer, ScrollToPlugin, TextPlugin, SplitText);
</script>
```

**Headline Split Pattern**
The h1 is split into `<span>` elements by phrase or word:
```html
<h1 class="heading-style-h1"><span>Your bold headline,</span><span class="span-break">split into spans</span></h1>
```

**Animation Technique**
Although the exact JS is in Webflow's compiled chunks, the pattern uses SplitText to split words/chars, then stagger their opacity/transform (typically `translateY(1.5rem)` → `translateY(0)`) with sequential delays. Common easing: `cubic-bezier(0.22, 1, 0.36, 1)` (elastic out).

**Rebuild in Next.js + Framer Motion**
```jsx
'use client';
import { motion } from 'framer-motion';

export function HeroHeadline() {
  const text = "Your bold headline here";
  const words = text.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (custom) => ({
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    }),
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1], // cubic-bezier
      },
    },
  };

  return (
    <motion.h1
      className="text-5xl font-bold leading-tight -tracking-[0.02em]"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, idx) => (
        <motion.span key={idx} variants={item} className="inline-block mr-2">
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}
```

---

### FLOATING GRADIENT BLOBS (WEBGL APPROXIMATION)

**What They Do**
The site uses UnicornStudio WebGL canvas elements (embedded as iframes or canvas tags) to render animated, organic gradient-blob shapes that float/drift behind content. These shapes have:
- Radial gradients (often vermillion #fc5f2b center fading to transparent)
- Slow continuous animation (rotation, scale pulse, position drift)
- Layered behind the main content with low opacity (~0.1–0.3)
- Blur effects to create a soft, "glow" appearance

**Why UnicornStudio is Hard to Replace**
UnicornStudio is a real-time shader tool; the blobs are GPU-accelerated with custom WebGL shaders. Full replication requires shader knowledge. Instead, approximate using **CSS + Framer Motion**:

**CSS-Only Approximation (No JS)**
```css
.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px) opacity(0.15);
  mix-blend-mode: multiply; /* or screen for light backgrounds */
  animation: blob-drift 8s ease-in-out infinite;
  pointer-events: none;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(
    circle at 30% 50%,
    #fc5f2b 0%,
    #fdba74 20%,
    transparent 70%
  );
  top: -100px;
  left: -150px;
}

.blob-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(
    circle at 40% 60%,
    #f7861e 0%,
    transparent 60%
  );
  bottom: -200px;
  right: -100px;
  animation: blob-drift 10s ease-in-out infinite reverse;
}

@keyframes blob-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(20px, -30px) scale(1.05); }
  50% { transform: translate(-10px, 20px) scale(0.95); }
  75% { transform: translate(30px, 10px) scale(1.02); }
}
```

**Framer Motion Version (Interactive)**
```jsx
'use client';
import { motion } from 'framer-motion';

export function HeroBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Blob 1 */}
      <motion.div
        className="absolute w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 50%, #fc5f2b 0%, #fdba74 20%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.15,
          mixBlendMode: 'multiply',
          top: '-100px',
          left: '-150px',
        }}
        animate={{
          x: [0, 20, -10, 30, 0],
          y: [0, -30, 20, 10, 0],
          scale: [1, 1.05, 0.95, 1.02, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Blob 2 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 60%, #f7861e 0%, transparent 60%)',
          filter: 'blur(80px)',
          opacity: 0.12,
          mixBlendMode: 'screen',
          bottom: '-200px',
          right: '-100px',
        }}
        animate={{
          x: [0, -20, 15, -25, 0],
          y: [0, 30, -20, -10, 0],
          scale: [1, 0.95, 1.08, 0.98, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          direction: 'reverse',
        }}
      />
    </div>
  );
}
```

**Key Techniques**
- **Heavy blur** (80–140px) creates that soft-focus glow
- **Low opacity** (0.12–0.3) keeps it atmospheric, not dominant
- **Radial-gradient** with tightly-clustered color stops (0%–20%) then rapid fade to transparent (60%–70%)
- **Mix-blend-mode: multiply** darkens; **screen** lightens (test both)
- **Slow animation** (8–10s cycle) with ease-in-out keeps it subtle
- **Position: absolute** with **z-index: 0** (behind all content)

---

### DARK/LIGHT SECTION TRANSITIONS & SEAMS

**Section Alternation Pattern**
The page uses alternating backgrounds:
- **Light sections** (`section-sp2_intro`, `section_sp2-check`): background white or zinc-50 (#fafafa)
- **Dark sections** (`howitworks`): background dark (likely zinc-900 #18181b or similar)

**CSS for Dark Section**
```css
.howitworks {
  background-color: var(--color-bg-dark, #18181b);
  color: white;
  position: relative;
  overflow: hidden;
}

.howitworks__bg-slot {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.howitworks__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  visibility: hidden;
  pointer-events: none;
  border-radius: 0.5rem;
  overflow: hidden;
}

.howitworks__bg.is-active {
  visibility: visible;
  z-index: 2;
  animation: howitworks-bg-enter 800ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

.howitworks__bg.is-prev {
  visibility: visible;
  z-index: 1;
  animation: howitworks-bg-prev 800ms cubic-bezier(0.4, 0, 0.2, 1) both;
  filter: brightness(0.5);
}

@keyframes howitworks-bg-enter {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes howitworks-bg-prev {
  from { transform: translateY(0); }
  to   { transform: translateY(-11rem); }
}
```

**Gradient Fade Seams (Mask Technique)**
To blend light↔dark seams smoothly, the site uses `linear-gradient` pseudo-elements or mask-image:

```css
/* Top fade (light section fading into dark) */
.section-fade-top::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5rem;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* Bottom fade (dark section fading into light) */
.section-fade-bottom::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 5rem;
  background: linear-gradient(
    to top,
    rgba(24, 24, 27, 1) 0%,
    rgba(24, 24, 27, 0.5) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 2;
}
```

**Framer Motion Approach for Section Transitions**
```jsx
export function SectionTransition({ isDark }) {
  return (
    <motion.section
      className={isDark ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}
      initial={{ opacity: 0.95 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: false, amount: 0.2 }}
    >
      {/* Content */}
    </motion.section>
  );
}
```

---

### BACKDROP BLUR & GLASSMORPHISM

The site uses blurred glass-effect overlays on interactive elements:

```css
.faq-item {
  background-color: rgba(20, 20, 20, 0.5);
  -webkit-backdrop-filter: blur(1.5rem);
  backdrop-filter: blur(1.5rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.25rem;
  padding: 0.75rem 1rem;
  color: white;
}

.faq-item:hover {
  filter: brightness(90%);
  transition: filter 200ms ease-out;
}
```

For Next.js + Tailwind, use the backdrop blur utility:
```jsx
<button className="bg-black/50 backdrop-blur-[24px] border border-white/10 text-white rounded px-3 py-2 hover:brightness-90 transition-all">
  FAQ Item
</button>
```

---

### STAGGER & FADE-IN ANIMATIONS (ON SCROLL)

**Pattern: `data-stagger` Attribute**
Grid items fade in with a staggered Y-translate when they scroll into view:

```html
<div data-stagger="" class="sp2-check_grid">
  <div class="sp2-check_item">...</div>
  <div class="sp2-check_item">...</div>
  <!-- More items -->
</div>
```

**CSS**
```css
@media (min-width: 992px) {
  [data-stagger] > * {
    opacity: 0;
    transform: translateY(var(--stagger-distance, 1.5rem));
    transition:
      opacity var(--stagger-duration, 0.75s) linear,
      transform var(--stagger-duration, 0.75s) cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(var(--i, 0) * var(--stagger-delay, 0.15s));
    will-change: opacity, transform;
  }

  [data-stagger].is-visible > * {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**JavaScript (IntersectionObserver)**
```javascript
(function () {
  function init() {
    const groups = document.querySelectorAll('[data-stagger]');
    
    groups.forEach((group) => {
      const { staggerDelay, staggerDuration, staggerDistance } = group.dataset;
      if (staggerDelay) group.style.setProperty('--stagger-delay', `${parseFloat(staggerDelay) / 1000}s`);
      if (staggerDuration) group.style.setProperty('--stagger-duration', `${parseFloat(staggerDuration) / 1000}s`);
      if (staggerDistance) group.style.setProperty('--stagger-distance', `${parseFloat(staggerDistance) / 16}rem`);

      Array.from(group.children).forEach((item, i) => {
        item.style.setProperty('--i', i);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    groups.forEach((group) => observer.observe(group));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

**Framer Motion Equivalent**
```jsx
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export function StaggerGrid({ items }) {
  const { ref, inView } = useInView({ threshold: 0.15, margin: '0px 0px -10% 0px' });

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={container}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      className="grid gap-8"
    >
      {items.map((item, idx) => (
        <motion.div key={idx} variants={item}>
          {/* Item content */}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

---

### DESIGN TOKENS REFERENCE

| Token | Value | Usage |
|-------|-------|-------|
| **Color: Vermillion (brand)** | #fc5f2b | Primary CTA, gradient blob centers, accents |
| **Color: Vermillion steps** | #f7861e, #fdba74, #ffedd5 | Gradient layers, secondary accents |
| **Color: Dark background** | #18181b (zinc-900) | Dark sections, high-contrast areas |
| **Color: Light background** | #ffffff / #fafafa (zinc-50) | Default body, cards, light sections |
| **Text: Primary** | #18181b (zinc-900) | Body text on light backgrounds |
| **Text: Secondary** | #a1a1aa (zinc-500) | Muted text, hints, subheadings |
| **Border** | #e4e4e7 (zinc-200) | Card borders, dividers |
| **Backdrop blur** | blur(24px) – blur(139px) | Glass effect overlays |
| **Letter-spacing** | -0.02em | All headings (tight kerning) |
| **Border-radius** | 0.25rem – 2.5rem | Cards, buttons, sections |
| **Line-height: H1** | 1 / -0.02em | Tight, premium feel |
| **Font: Headings** | NB International Pro (neo-grotesque) | All headings, large body |
| **Font: Body** | Adobe Typekit adelle-sans | Paragraph text |
| **Shadow: Soft** | 0 0.25rem 0.25rem #0000001a, 0 1rem 1.5rem #0000001a | Card elevation |
| **Shadow: Glow** | 0 0.25rem 0.625rem #fc5f2b29 | Vermillion accent glow |

---

### IMPLEMENTATION CHECKLIST

- [ ] Set up video player (Plyr + HLS.js) with poster image fallback
- [ ] Implement headline split text with staggered reveal
- [ ] Create floating blob gradients (CSS animation or Framer Motion)
- [ ] Layer blobs behind hero with `z-index: 0`, `mix-blend-mode`, heavy blur
- [ ] Build dark/light section alternation with fade seams
- [ ] Use IntersectionObserver or Framer Motion for scroll triggers
- [ ] Apply backdrop blur to interactive overlays (FAQ, modals)
- [ ] Test on Safari (may need webkit prefixes for backdrop-filter)
- [ ] Ensure `pointer-events: none` on background elements
- [ ] Verify performance: use will-change, GPU acceleration, lazy-load videos

---

### 3.2 — Scroll-triggered reveals, parallax & carousels

### Scroll-Triggered Reveals (IntersectionObserver + CSS)

**What it does:** Elements fade in and slide up (`translateY(1.5rem) → 0`) in staggered groups as they enter the viewport.

**How it's triggered:** IntersectionObserver with threshold 15% and bottom margin (-10%) detects when a parent `[data-stagger]` container comes into view, then adds `.is-visible` class.

**Timing & easing:**
- Duration: 0.75s (customizable via `--stagger-duration` CSS var)
- Stagger delay: 0.15s per child (customizable via `--stagger-delay`)
- Distance: 1.5rem (customizable via `--stagger-distance`)
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-back, snappy)

**CSS pattern (from page):**
```css
[data-stagger] > * {
  opacity: 0;
  transform: translateY(var(--stagger-distance, 1.5rem));
  transition:
    opacity var(--stagger-duration, 0.75s) linear,
    transform var(--stagger-duration, 0.75s) cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: calc(var(--i, 0) * var(--stagger-delay, 0.15s));
  will-change: opacity, transform;
}

[data-stagger].is-visible > * {
  opacity: 1;
  transform: translateY(0);
}
```

**Framer Motion rebuild:**
```jsx
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export function StaggerReveal({ children, distance = 24, delay = 0.15, duration = 0.75 }) {
  const { ref, inView } = useInView({
    threshold: 0.15,
    rootMargin: '0px 0px -10% 0px',
    triggerOnce: true,
  });

  const containerVariants = {
    visible: {
      transition: { staggerChildren: delay, delayChildren: 0 },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <motion.div key={i} variants={childVariants}>
            {child}
          </motion.div>
        ))
      ) : (
        <motion.div variants={childVariants}>{children}</motion.div>
      )}
    </motion.div>
  );
}
```

---

### Testimonials Carousel (Infinite Loop + Auto-Rotate + Drag)

**What it does:** 5 testimonial cards rotate automatically every 8 seconds (750ms transition). Users can drag left/right, click pagination bullets, or use mousewheel to navigate. Smooth infinite loop with cloned slides.

**How it's triggered:**
- Auto-rotation: 8s timer
- Drag: mouse/touch on `.sp2-testimonials2_track`
- Pagination: click `.sp2-testimonials2_bullet`
- Wheel: shift+scroll or horizontal scroll

**HTML structure (minimal):**
```html
<div data-sp2-testimonials2="">
  <div data-sp2-testimonials2-swiper="" class="sp2-testimonials2_swiper">
    <div class="sp2-testimonials2_track">
      <div class="sp2-testimonials2_slide"><!-- card --></div>
      <!-- cloned copies added via JS -->
    </div>
  </div>
  <div data-sp2-testimonials2-pagination=""></div>
  <div data-sp2-testimonials2-counter="">1 / 5</div>
</div>
```

**Timing & easing:**
- Auto-rotate: 8000ms
- Transition: 750ms with `cubic-bezier(0.45, 0, 0.55, 1)`
- Progress bar: linear fill during countdown, instant reset
- Counter number: 250ms in/out with ease-in/ease-out for vertical flip

**Key mechanics:**
1. **Infinite loop**: Triple the slides ([copy of last N, originals, copy of first N]). After each transition, snap back to middle copy without user seeing it.
2. **Progress bars**: Dynamic fill based on remaining time. Pauses on drag.
3. **Counter animation**: Text slides out/in with 100% translateX offset, opacity 0 → 1.

**Framer Motion rebuild (simplified):**
```jsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

export function TestimonialsCarousel({ slides }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const timerRef = useRef(null);
  const dragRef = useRef({ startX: 0, isDragging: false });

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 1000 : -1000, opacity: 0 }),
  };

  const paginate = (newIdx, newDir) => {
    setDirection(newDir);
    setCurrent(newIdx % slides.length);
    resetTimer();
  };

  const resetTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      paginate(current + 1, 1);
    }, 8000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearTimeout(timerRef.current);
  }, [current]);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.75, ease: [0.45, 0, 0.55, 1] }}
        >
          {/* Slide content */}
        </motion.div>
      </AnimatePresence>

      {/* Progress bars */}
      <div className="flex gap-2">
        {slides.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 bg-zinc-200 rounded-full overflow-hidden"
            animate={{
              backgroundColor: i === current ? '#18181b' : 'rgba(24,24,27,0.2)',
            }}
          >
            <motion.div
              className="h-full bg-zinc-900"
              initial={{ width: 0 }}
              animate={i === current ? { width: '100%' } : { width: 0 }}
              transition={i === current ? { duration: 7.25, ease: 'linear' } : { duration: 0 }}
            />
          </motion.div>
        ))}
      </div>

      {/* Counter with flip animation */}
      <div className="text-sm">
        <motion.span
          key={current}
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {current + 1}
        </motion.span>
        {' / '}
        {slides.length}
      </div>
    </div>
  );
}
```

---

### Social Proof Slider (Infinite + Drag + Smooth Snap)

**What it does:** Mixed grid of cards (text, image, video) drag horizontally. Infinite loop with smooth snapping. Cards have special Safari video-layer handling.

**Timing & easing:**
- Drag transition: 0.4s with `cubic-bezier(0.25, 1, 0.5, 1)`
- Auto-normalize position (snap back to middle copy): imperceptible (transition: none)

**Drag mechanics:**
1. Calculate move distance from start X to current X
2. If drag > 15% viewport width, snap to next/prev
3. Velocity not used; simple threshold-based snap

**Framer Motion approach:**
```jsx
export function SocialProofSlider({ cards }) {
  const [x, setX] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleDragEnd = (e, info) => {
    const threshold = window.innerWidth * 0.15;
    if (info.offset.x > threshold) {
      setX((prev) => prev + window.innerWidth);
    } else if (info.offset.x < -threshold) {
      setX((prev) => prev - window.innerWidth);
    }
  };

  return (
    <motion.div
      drag="x"
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      animate={{ x }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="flex gap-4"
    >
      {cards.map((card, i) => (
        <div key={i} className="flex-shrink-0 w-full">
          {/* card */}
        </div>
      ))}
    </motion.div>
  );
}
```

---

### Membership Slider (Stacked: Left Image, Right Content)

**What it does:** 4 slides cycle automatically every 5 seconds (left: large image, right: text content + CTA). Seamless drag, progress bars, counter with flip animation.

**Layout:** Two-column grid. Left is `.sp3-membership_left` (image carousel). Right is `.sp3-membership_right` (static content).

**Timing:**
- Auto-rotate: 5000ms (shorter than testimonials)
- Transition: 750ms with `cubic-bezier(0.45, 0, 0.55, 1)` (same easing)
- Progress bars: flex-grow animated, 0.75s easing

**Key differences from testimonials:**
- Slightly faster auto-rotate
- Right column content doesn't animate (only image moves)
- 4 progress bars instead of 5

**Framer Motion rebuild:**
```jsx
export function MembershipSlider({ images, content }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const xOffset = -(idx * 100);

  const resetTimer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIdx((prev) => (prev + 1) % images.length);
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearTimeout(timerRef.current);
  }, [idx]);

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: carousel */}
      <motion.div
        animate={{ x: xOffset + '%' }}
        transition={{ duration: 0.75, ease: [0.45, 0, 0.55, 1] }}
        className="flex"
      >
        {images.map((img, i) => (
          <div key={i} className="flex-shrink-0 w-full">
            <img src={img} alt="" />
          </div>
        ))}
      </motion.div>

      {/* Right: content (static per slide) */}
      <div>
        <h2>{content[idx].title}</h2>
        <ul>
          {content[idx].bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      {/* Progress bars */}
      <div className="flex gap-2 mt-4">
        {images.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 flex-1 bg-zinc-200 rounded-full"
            animate={{
              flexGrow: i === idx ? 8 : 1,
            }}
            transition={{ duration: 0.75, ease: [0.45, 0, 0.55, 1] }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Athletes Slider Drag (Custom Drag Slider)

**What it does:** Lightweight custom drag slider (referenced external `athletes_slider_drag-1.0.0.js`). Supports mouse/touch drag with momentum-like behavior. No auto-rotate.

**Pattern inferred from code:**
- Stores `currentIdx`, drag start/move/end positions
- Translates list via `translate3d(-offset, 0, 0)`
- Snap-to-card logic: find nearest card based on current transform
- Uses `cubic-bezier(0.4, 0, 0.2, 1)` for smooth ease-in/out

**Framer Motion Embla alternative (recommended):**
Instead of rebuilding custom drag logic, use **Embla Carousel** (headless, Tailwind-friendly):

```jsx
import useEmblaCarousel from 'embla-carousel-react';

export function AthletesSlider({ items }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: true, // momentum drag
    align: 'start',
  });

  return (
    <div className="overflow-hidden" ref={emblaRef}>
      <div className="flex gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex-shrink-0 w-[80%] md:w-[40%]">
            {/* item */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Or **Framer Motion drag** with snap-to-grid:
```jsx
import { motion } from 'framer-motion';

export function AthletesSlider({ items }) {
  const [x, setX] = useState(0);
  const itemWidth = 320; // px

  const handleDragEnd = (e, info) => {
    const snappedX = Math.round(info.offset.x / itemWidth) * itemWidth;
    setX(Math.max(-(items.length - 1) * itemWidth, Math.min(0, snappedX)));
  };

  return (
    <div className="overflow-hidden">
      <motion.div
        drag="x"
        dragElastic={0.1}
        x={x}
        onDragEnd={handleDragEnd}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="flex gap-4"
      >
        {items.map((item, i) => (
          <motion.div key={i} className="flex-shrink-0 w-80">
            {/* item */}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
```

---

### Common Easing Values (Reference)

**Used across superpower.com:**
- **Smooth reveal/stagger:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-back)
- **Carousel transition:** `cubic-bezier(0.45, 0, 0.55, 1)` (ease-in-out-quad)
- **Smooth drag snap:** `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-expo)
- **Morphing/navbar:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-bounce-light)

---

### Implementation Checklist

1. **Stagger Reveals:** IntersectionObserver + CSS or Framer Motion `whileInView`
2. **Testimonials/Membership Carousels:** Use Embla for simplicity, or hand-code with clone pattern if you need precise control matching the design
3. **Auto-rotate:** `setInterval` or `useEffect` + `setTimeout` to trigger paginate every N seconds
4. **Drag:** Framer Motion `drag="x"` with `dragElastic` and `onDragEnd` snapping logic
5. **Progress bars:** Conditional `animate` based on `currentIndex`; linear `ease: 'linear'` fill
6. **Counter flip:** AnimatePresence + key-based re-render with `initial={{ x: direction > 0 ? '-100%' : '100%' }}`
7. **Pause on interaction:** Clear timer on drag start, restart on drag end or click
8. **Infinite loop:** Clone real slides at start (reversed order) and end; normalize position imperceptibly after transition

---

### 3.3 — Components: FAQ/accordion, countdown + announcement bar, lab-search, async buttons, modals

### Async Button States

**Behavior:** Button shows a loading spinner and custom text while a fetch or form submission is in progress, with the original label hidden. The button is disabled (pointer-events: none) during the loading state. After navigation, the loading state persists until the page unloads. For anchor links (#), it resets after 800ms since no navigation occurs.

**Trigger:** Button click with `data-wait="Custom text..."` attribute. Auto-detected by class detection: `sp2_btn` must be present, and buttons must have `href`, `type="submit"`, or `data-navigate="true"` to trigger loading.

**Timing & Easing:** All transitions use `cubic-bezier(0.4, 0, 0.2, 1)` (easeInOutQuart-ish) over 0.25s. Ripple animation: 0.6s ease-out. Spinner rotation: 0.7s linear infinite (360deg).

**React + Framer Motion Rebuild:**

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export function AsyncButton({ 
  children, 
  onClick, 
  waitText = "Loading...",
  ...props 
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    setIsLoading(true);
    try {
      await onClick?.(e);
    } finally {
      // For real navigation, button stays loading. For async actions:
      if (!props.href || props.href.startsWith('#')) {
        setTimeout(() => setIsLoading(false), 800);
      }
    }
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isLoading || props.disabled}
      className={`relative overflow-hidden px-6 py-3 rounded-lg transition-all duration-250 
        ${isLoading ? 'pointer-events-none' : ''}`}
    >
      <motion.div
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="inline-flex items-center gap-1"
      >
        {children}
      </motion.div>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center gap-2"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
          <span className="text-sm font-medium">{waitText}</span>
        </motion.div>
      )}
    </button>
  );
}
```

---

### Accordion (Biomarker Explorer Pattern)

**Behavior:** Single-open accordion with smooth height and content animations. Opening an item closes all others. The icon (plus sign) rotates 90deg on active state. Panel height animates from 0 to `scrollHeight` (dynamic). Content fades in after a 100ms delay to create a staggered feel.

**Trigger:** Click or keyboard (Enter/Space) on `.accordion__header`. Keyboard navigation also supported (arrow keys to move between headers, typically added by Webflow).

**Timing & Easing:** Panel max-height: 0.4s cubic-bezier(0.4, 0, 0.2, 1). Content opacity: 0.5s cubic-bezier(0.4, 0, 0.2, 1) with 100ms delay. Icon bg-color: 0.5s cubic-bezier(0.4, 0, 0.2, 1).

**React + Framer Motion Rebuild:**

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Accordion({ items }) {
  const [activeId, setActiveId] = useState(null);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isOpen = activeId === item.id;
        return (
          <motion.div
            key={item.id}
            className="border border-zinc-200 rounded-lg bg-white"
            animate={{ borderColor: isOpen ? '#fc5f2b' : '#e8e8e8' }}
            transition={{ duration: 0.5 }}
          >
            <button
              onClick={() => setActiveId(isOpen ? null : item.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveId(isOpen ? null : item.id);
                }
              }}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between p-7 text-left font-medium text-zinc-900"
            >
              <span>{item.title}</span>
              <motion.div
                animate={{ 
                  backgroundColor: isOpen ? '#f4f4f5' : '#f5f5f5',
                  rotate: isOpen ? 90 : 0
                }}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
              >
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <line x1="8" y1="2" x2="8" y2="14" stroke="#999" strokeWidth="1.5" />
                  <line x1="2" y1="8" x2="14" y2="8" stroke="#999" strokeWidth="1.5" />
                </motion.svg>
              </motion.div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="px-7 pb-7 text-zinc-600 text-sm leading-relaxed"
                  >
                    {item.content}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
```

---

### Countdown Timer + Sticky Announcement Bar

**Behavior:** Countdown displays time remaining until a target date in "DDd HHh MMm SSs" format. Updates every 1 second. When expired, the entire wrapper (`.sp2_banner-bottom` or `[data-timer-wrapper]`) hides via `display: none`. The sticky bar enters from the bottom when page scroll exceeds 10px, with a smooth slide-up transition. It syncs its position to avoid overlapping with other sticky elements like `.sp2_sticky-cta-wrap`.

**Trigger:** Timer element with `data-timer="YYYY-MM-DD"` attribute. Sticky bar uses passive scroll listener (no blocking). Auto-initializes on DOMContentLoaded.

**Timing & Easing:** Sticky banner slide-up: 0.4s ease. Timer text updates: synchronous (no animation, just text swap).

**React + Framer Motion Rebuild:**

```tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const target = new Date(targetDate);
      // If target is in the past, look for next year
      if (target < now) target.setFullYear(target.getFullYear() + 1);

      const diff = target - now;
      if (diff <= 0) {
        setIsExpired(true);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      setTimeLeft(`${pad(days)}D ${pad(hours)}H ${pad(minutes)}M ${pad(seconds)}S`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isExpired) return null;

  return (
    <div className="text-center font-mono text-sm text-zinc-500">
      {timeLeft}
    </div>
  );
}

export function StickyAnnouncementBar({ children }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      animate={{ y: isVisible ? 0 : '100%' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 p-4 z-40"
    >
      {children}
    </motion.div>
  );
}
```

---

### Lab Search Widget (Filter-as-You-Type)

**Behavior:** Input field accepts zip code or city name with client-side autocomplete. User can search immediately or click the Search button. Results display dynamically with lab name, address, distance, and star ratings. The results list has fade gradients at top/bottom using CSS pseudo-elements to create a "peek" effect. Autocomplete populates from an external API (lazy-loaded on first trigger). Results scroll internally; the list is scrollable with a custom scrollbar (width: 0.25rem, gray).

**Trigger:** Typing in `[data-lab-input]` triggers debounced filter/autocomplete. Clicking `[data-lab-search-btn]` submits search. The external locations script (`quest-locations.js`) is lazy-loaded the first time the user clicks a trigger to open the locations modal.

**Timing & Easing:** Autocomplete dropdown and results appear instantly (no animation in source code). Debounce: typically 300–500ms (not explicitly defined in the snippet but standard practice). Tab navigation between input and button.

**React + Framer Motion Rebuild:**

```tsx
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function LabSearch({ labs = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef(null);

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setShowAutocomplete(false);
      return;
    }

    // Debounce filter
    debounceRef.current = setTimeout(() => {
      const filtered = labs.filter((lab) =>
        lab.name.toLowerCase().includes(value.toLowerCase()) ||
        lab.city.toLowerCase().includes(value.toLowerCase()) ||
        lab.zip?.startsWith(value)
      );
      setResults(filtered);
      setShowAutocomplete(true);
    }, 300);
  }, [labs]);

  const handleSearch = () => {
    setShowAutocomplete(false);
    setShowResults(true);
  };

  const handleSelectLocation = (location) => {
    setQuery(`${location.zip}, ${location.city}`);
    setShowAutocomplete(false);
    // Re-filter to show results for selected location
    const filtered = labs.filter((lab) => lab.zip === location.zip);
    setResults(filtered);
    setShowResults(true);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            data-lab-input
            type="text"
            placeholder="Enter zip code or city name"
            value={query}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            maxLength={50}
            autoComplete="off"
          />

          <AnimatePresence>
            {showAutocomplete && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-lg shadow-lg z-50"
              >
                {results.slice(0, 5).map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectLocation(result)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm text-zinc-900">{result.zip}</div>
                    <div className="text-xs text-zinc-500">{result.city}, {result.state}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          data-lab-search-btn
          onClick={handleSearch}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Results with fade gradients */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative mt-4 max-h-96 overflow-y-auto border border-zinc-200 rounded-lg"
          >
            {/* Top fade gradient */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

            {/* Results list */}
            <div className="space-y-2 p-4">
              {results.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-4">No labs found</div>
              ) : (
                results.map((lab) => (
                  <a
                    key={lab.id}
                    href={lab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-sm text-zinc-900">{lab.name}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <span>{lab.distance}km</span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600">{lab.address}</div>
                    <div className="flex gap-0.5 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-xs ${
                            i < Math.floor(lab.rating) ? 'text-yellow-500' : 'text-zinc-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </a>
                ))
              )}
            </div>

            {/* Bottom fade gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### FAQ Modals with Gradient Headers & Sidenav Navigation

**Behavior:** Each FAQ trigger button opens a modal overlay with a hero image (with gradient overlay), a title, content, and a close button. Multiple modals are grouped (e.g., `data-modal-group="faq"`). When one modal opens, others in the group close. A sidebar navigation (sidenav) lists all available FAQs; clicking a nav item switches modals within the group. Mobile nav buttons (prev/next) allow sequential navigation. The modal dialog slides up from below with a fade-in. The backdrop blurs content behind it. Scroll is locked when modal is open. Elements with `data-modal-hide` (sticky nav, footer) animate down and hide when modal opens.

**Trigger:** Click a button with `data-modal-target="modal-id"` attribute. Groups are defined via `data-modal-group="groupName"`. Close via X button or backdrop click (backdrop click configured in JS to close).

**Timing & Easing:** Dialog slide-in: translateY(3rem) opacity 0 → translateY(0) opacity 1 over 500ms with `cubic-bezier(0.16, 1, 0.3, 1)` (expoCubicOut). Switch between modals: 250ms slide-out + 400ms slide-in staggered. Backdrop opacity: 300ms ease. Content hide: 250ms transform + opacity ease.

**React + Framer Motion Rebuild:**

```tsx
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FAQModalSystem({ modals }) {
  const [activeModalId, setActiveModalId] = useState(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const lastFocusRef = useRef(null);

  useEffect(() => {
    if (scrollLocked) {
      document.documentElement.style.overflow = 'hidden';
      lastFocusRef.current = document.activeElement;
    } else {
      document.documentElement.style.overflow = '';
      lastFocusRef.current?.focus();
    }
  }, [scrollLocked]);

  const handleOpenModal = (modalId) => {
    setActiveModalId(modalId);
    setScrollLocked(true);
  };

  const handleCloseModal = () => {
    setActiveModalId(null);
    setScrollLocked(false);
  };

  const activeModal = modals.find((m) => m.id === activeModalId);

  return (
    <>
      {/* Sidenav */}
      <AnimatePresence>
        {activeModalId && (
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 0.1 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 w-48 bg-white rounded-lg shadow-lg p-4 z-50"
          >
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">FAQs</h3>
            <ul className="space-y-2">
              {modals.map((modal) => (
                <li key={modal.id}>
                  <button
                    onClick={() => setActiveModalId(modal.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors text-sm ${
                      activeModalId === modal.id
                        ? 'bg-orange-500 text-white'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    {modal.title}
                  </button>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {activeModalId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/40 backdrop-blur-xl z-40"
          />
        )}
      </AnimatePresence>

      {/* Modal Dialog */}
      <AnimatePresence mode="wait">
        {activeModal && (
          <motion.div
            key={activeModal.id}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Hero Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={activeModal.image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>

            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-zinc-100 transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-12rem)] p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-zinc-900 mb-4">{activeModal.title}</h3>
              <div className="prose prose-sm max-w-none text-zinc-700">
                {activeModal.content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Buttons */}
      <div className="space-y-3">
        {modals.map((modal) => (
          <button
            key={modal.id}
            onClick={() => handleOpenModal(modal.id)}
            className="w-full text-left p-4 border border-zinc-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-zinc-900">{modal.title}</h4>
            <p className="text-sm text-zinc-600 mt-1">{modal.summary}</p>
          </button>
        ))}
      </div>
    </>
  );
}
```

---

### Exit-Intent & Referral Modals (Klaviyo Pattern)

**Behavior:** A marketing modal appears with two states: (1) form state with email input, submit button, and call-to-action; (2) success state showing confirmation message. Email validation occurs client-side before submission. On submit, the button shows "Sending…" with disabled state. The form posts to Klaviyo's subscription API. On success, the form state hides and success state animates in. Error messages display inline below the input field. The modal can be closed via an X button in the top-right corner. A side image scales and animates alongside the form.

**Trigger:** Typically triggered by exit-intent (when user moves cursor toward close button) via Klaviyo script, or displayed on page load as an overlay. Can also be triggered manually via `window.SP2Modal?.open()`.

**Timing & Easing:** Form/success state switch: 0.25s ease-in for fade out, then 0.25s ease-out for fade in. Button loading spinner (if included): 0.7s linear infinite rotation.

**React + Framer Motion Rebuild:**

```tsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function KlaviyoSignupModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState('');
  const [state, setState] = useState('form'); // 'form' | 'success'

  const validateEmail = (e) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasError('');

    if (!validateEmail(email)) {
      setHasError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        'https://a.klaviyo.com/client/subscriptions/?company_id=XEKaRD',
        {
          method: 'POST',
          headers: {
            'revision': '2023-08-15',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              type: 'subscription',
              attributes: {
                email,
                subscription_state: 'subscribed',
              },
            },
          }),
        }
      );

      if (!response.ok) throw new Error('Subscription failed');

      setState('success');
    } catch (err) {
      setHasError('Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-row-reverse"
      >
        {/* Side Image */}
        <motion.div
          className="hidden sm:block w-1/2 relative"
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <img
            src="/modal-image.webp"
            alt="Superpower app"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Form / Success Content */}
        <div className="w-full sm:w-1/2 p-8 relative">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <AnimatePresence mode="wait">
            {state === 'form' ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                    Get simple, free protocols
                  </h3>
                  <p className="text-sm text-zinc-600">
                    Designed by world-class physicians
                  </p>
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setHasError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                      hasError ? 'border-red-500' : 'border-zinc-300'
                    }`}
                    autoComplete="email"
                  />
                  {hasError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 mt-2"
                    >
                      {hasError}
                    </motion.p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Sending…' : 'Continue for free'}
                </button>

                <ul className="space-y-2 text-sm text-zinc-700">
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Improving energy with simple lifestyle changes</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Reducing heart attack risk if you're 30+</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Slowing your pace of aging</span>
                  </li>
                </ul>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 text-center"
              >
                <h3 className="text-2xl font-bold text-zinc-900">
                  Thanks for signing up!
                </h3>
                <p className="text-sm text-zinc-600">
                  Your health journey starts now. Watch your inbox for updates
                  and smarter health insights – stay tuned.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-zinc-100 text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

### Token Reference for Styling

**Color System:**
- Brand accent (vermillion): `#fc5f2b` (orange-600 in Tailwind)
- Active/highlight borders: `#FC5F2B`
- Icons/secondary: `#999999` (zinc-500–zinc-600)
- Backgrounds: white, `#f5f5f5` (zinc-50), `#f4f4f4` (zinc-100)
- Text primary: `#1a1a1a` (zinc-900)
- Text secondary: `#666666` (zinc-600)
- Borders: `#e8e8e8` (zinc-200)

**Typography:**
- Headings (h3): 1.25rem (20px), font-semibold
- Body: 1rem (16px), font-normal
- Small text: 0.875rem (14px)
- Letter-spacing: tight (`-0.02em`)

**Spacing & Sizing:**
- Accordion padding: 1.5rem x 1.75rem
- Modal dialog gap: 3rem (48px slide distance)
- Accordion icon: 2.5rem diameter (on mobile: 2rem)
- Border radius: 1rem (16px) for accordion, 0.5rem for icons, 9999px (full) for buttons

**Easing & Timing:**
- Standard easing: `cubic-bezier(0.4, 0, 0.2, 1)` (0.4s–0.5s)
- Expo out (modal slide): `cubic-bezier(0.16, 1, 0.3, 1)` (500ms)
- Linear (spinner): 0.7s

**Shadows:**
- Modal: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
- Subtle: `0 4px 6px -1px rgba(0, 0, 0, 0.1)`

**Backdrop & Blur:**
- Modal backdrop blur: 1.5rem (24px) or 139px depending on context
- Ease in/out: `cubic-bezier(0.16, 1, 0.3, 1)` over 0.3s

---

### Implementation Notes for Next.js 14

1. **Use Framer Motion's `AnimatePresence`** for mounting/unmounting animations (accordions, modals, alerts).
2. **Debounce search input** with `useCallback` + `useRef` and `setTimeout` to avoid excessive re-renders.
3. **Lock scroll** on modal open by setting `document.documentElement.style.overflow = 'hidden'` and restore on close.
4. **Timer updates** should use `setInterval` with cleanup in `useEffect` to avoid memory leaks.
5. **Store modal state** at a high level (context or Zustand) if multiple modals need to sync.
6. **Lazy-load scripts** (like Klaviyo or external location data) only when triggered; use a flag ref to prevent duplicate loads.
7. **Keyboard accessibility:** Modals should trap focus with `focus-visible` rings; accordions support Enter/Space to toggle.
8. **Respect `prefers-reduced-motion`** by wrapping animations in `motion` config or checking `window.matchMedia('(prefers-reduced-motion: reduce)')`.

---

## 4. Layout & Composition

### Container & Viewport System

The site uses a nested-container pattern for maximum flexibility across breakpoints:

**Primary constraints:**
- `.container-large`: max-width 80rem (1280px) — the workhorse for most content sections
- `.container-medium`: max-width 64rem — tighter option for text-heavy pages
- `.container-small`: max-width 48rem — columnular layouts (timelines, FAQs)
- Larger variants: `.container-xlarge` (90rem) and `.container-xxlarge` (95rem) for hero/full-bleed sections
- All use `margin-left: auto; margin-right: auto;` for perfect centering + width: 100%

**Horizontal padding (via `.page-padding`):**
- Desktop: 2.5rem left/right
- Mobile: 1.5rem left/right
- Creates breathing room while keeping text readable

This two-layer structure (.page-padding wrap + .container-large inside) achieves the "premium restraint" look — content doesn't feel crowded, and the whitespace is *structural*, not accidental.

### Vertical Rhythm & Section Padding

Superpower uses discrete section padding classes for predictable, composable spacing rhythm:

- `.padding-section-xsmall`: 2rem top/bottom
- `.padding-section-small`: 3rem top/bottom (introductions, small cards)
- `.padding-section-medium`: 5rem top/bottom (featured sections)
- `.padding-section-large`: 7rem top/bottom (hero sections, major dividers)
- `.padding-section-xlarge`: 10rem top/bottom (statement sections)
- `.padding-section-xxlarge`: 12rem top/bottom (rare; showstopper sections)

**The rhythm principle:** The same section never repeats padding back-to-back. Alternating `.padding-section-medium` with `.padding-section-large` creates visual breathing that reads as intentional, not formulaic. This is what makes 80% of the page feel "generous" while staying performant.

Combine with alternating background colors (white → zinc-50 → white) to reinforce sections without hard borders.

### Heading Hierarchy & Composition

Type sizes establish visual weight and reading order with *aggressive negative letter-spacing* (the secret to premium feel):

```
h1: 3.75rem / line-height: 1 / letter-spacing: -.02em
h2: 3rem / 1.2 / -.0225em
h3: 2rem / 1.25 / -.02em
h4: 1.5rem / 1.2-1.25 / -.025em
h5: 1.5rem / 1.2 / -.025em
h6: 1.25rem / 1.4 / -.0125em
```

**Composition pattern — never use h2 alone:**
1. Optional: small caps/eyebrow in `.color-text-secondary` (zinc-500)
2. h2 or h3 as statement (usually h3 with h2 reserved for hero)
3. Optional: muted subtitle (body copy at 0.875rem in zinc-600)
4. Optional: CTA or small detail row below

Example structure:
```html
<div>
  <p class="text-secondary text-size-small">What makes it different</p>
  <h2>Clinical-grade tests, consumer-friendly pricing</h2>
  <p class="text-secondary">50+ biomarkers analyzed every quarter, no filler.</p>
</div>
```

The "restraint" is the muted subtitle — it's half the visual weight of the headline, so the eye knows where to focus.

### The Oversized Stat / KPI Pattern

Large numbers live in their own visual category. When a stat matters (comparison, outcome, metric):

```
.heading-style (for stat numbers): 4.375rem / line-height 1 / letter-spacing -.025em
```

Pair with:
- A small muted label (zinc-500, 0.875rem) above or below
- Light background (zinc-50) or subtle border (zinc-200) to isolate it
- Border-radius 0.75rem–1.5rem (rounded but not pill-shaped)

This makes the stat "breathe" — it's not in the text flow, it's a visual landmark.

### Card & Contained Element Patterns

Cards use consistent spacing & border strategies for coherence:

**Standard card spacing (internally):**
- Padding: 1.5rem–2rem (depending on density)
- Grid gap within cards: 0.75rem–1.5rem for rows/cols
- Border: 1px solid #e4e4e7 (zinc-200)
- Border-radius: 0.75rem–1rem (modern rounded corners, not aggressive)
- Shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` (soft, barely visible unless hovering)

**Card grid composition:**
- Use CSS Grid or Flexbox with `gap: 1.5rem–2.5rem` between cards
- On desktop: 2–3 columns
- On tablet: stack to 2 columns
- On mobile: 1 column, full width minus `.page-padding`

Cards should not touch the viewport edge — even on mobile, `.page-padding` + 1–1.5rem margin inside the container keeps them inset.

### Text Column Width & Readability

Long-form content (blog, detailed guides) should live in a `max-width: 40–50rem` column to avoid eye-strain:

```html
<div class="container-large">
  <div style="max-width: 50rem; margin: 0 auto;">
    <h1>Detailed article heading</h1>
    <p>Article body lives here...</p>
  </div>
</div>
```

Or use `.container-small` (max-width 48rem) directly for that section. This is not used on every section — reserve it for clarity in text-heavy contexts. Marketing sections can full-bleed to 80rem.

### Color Alternation & Surface Continuity

Create visual rhythm through background layering:

```
Section 1: background-color: white (#ffffff)
Section 2: background-color: #fafafa (zinc-50)
Section 3: background-color: white
Section 4: background-color: #f4f4f5 (zinc-100, rare)
Dark sections: background-color: #18181b (zinc-900)
```

**Pattern rule:** Never two white sections in a row without visual content between them (a divider, spacing, or accent color). The alternation is what signals "new section" to the eye.

Text color hierarchy:
- Headings & primary text: #18181b (zinc-900) on light surfaces
- Secondary text (labels, captions): #71717a (zinc-600)
- Muted text (metadata, fine print): #a1a1aa (zinc-400)
- Accent text (highlights, CTAs): #fc5f2b (vermillion)

### Spacing the Scroll

To avoid a "templated" feel, vary section content height:

- Some sections hero-heavy (60% image, 40% copy)
- Some sections 100% text
- Some sections alternating left/right image placement (staggered)
- Use `.page-padding` + `.padding-section-large` together so the breathing room scales with content

**Anti-pattern:** Repeating 3 identical cards in a grid 5 times in a row. Instead, break the grid:
- 3 cards in a grid
- 2 larger cards below (different aspect ratio, larger type)
- 1 full-width card (testimonial, case study)
- Then back to 3 cards

This is compositional variety — same system, different rhythm. It signals control & intentionality.

### Border Radius Strategy

Radii create visual softness without chaos:

| Use case | Radius | Hex |
|----------|--------|-----|
| Buttons, small inputs | 0.5rem | .5rem |
| Cards, moderate containers | 0.75rem–1rem | .75rem, 1rem |
| Larger grouped elements | 1.25–1.5rem | 1.25rem, 1.5rem |
| Fully rounded (badges, icons) | 9999px | 9999px |
| Barely rounded (subtle) | 0.25rem | .25rem |

Never mix radii erratically. If cards are 0.75rem, buttons inside cards should be 0.5rem (smaller). If a container is 1.5rem, its children max out at 1rem.

### Shadow Hierarchy

Shadows create depth without vibrancy:

**Baseline (cards at rest):**
```css
box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
```

**Elevated (hover, sticky elements):**
```css
box-shadow: 0 4px 8px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)
```

**Heavy (modals, floating UI):**
```css
box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)
```

**Accent glow (brand-colored elements, rare):**
```css
box-shadow: 0 0 16px rgba(252, 95, 43, 0.2)  /* vermillion with low opacity */
```

The key: opacity is always under 0.2, shadows are always warm-grey (not pure black), and they layer (not single `box-shadow`).

### Implementing in Tailwind + Framer Motion

**Container wrapping pattern:**
```tsx
export default function Section({ children }) {
  return (
    <section className="w-full bg-white px-2.5 lg:px-2.5 py-[7rem]">
      <div className="max-w-[80rem] w-full mx-auto">
        {children}
      </div>
    </section>
  );
}
```

Or use a custom Tailwind config:
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      maxWidth: {
        'container-sm': '48rem',
        'container-md': '64rem',
        'container-lg': '80rem',
        'container-xl': '90rem',
      },
      padding: {
        'page-x': '2.5rem',
        'page-x-mobile': '1.5rem',
      },
      spacing: {
        'section-xs': '2rem',
        'section-sm': '3rem',
        'section-md': '5rem',
        'section-lg': '7rem',
        'section-xl': '10rem',
        'section-2xl': '12rem',
      },
    },
  },
};
```

Then:
```tsx
<section className="w-full px-page-x-mobile lg:px-page-x py-section-lg bg-zinc-50">
  <div className="max-w-container-lg mx-auto">
    {/* Content */}
  </div>
</section>
```

**Responsive padding rhythm:**
```tsx
<section className="py-[3rem] md:py-[5rem] lg:py-[7rem]">
```

This scales the breathing room with viewport size, preventing mobile sections from feeling cramped or desktop from feeling sparse.

### What Makes It Premium (Not Templated)

1. **Generous whitespace:** The 2.5rem horizontal padding isn't the minimum — it's deliberate. On desktop, there are always 100–150px of white margin outside the content.

2. **Negative letter-spacing:** The tight tracking on all headings (-.02em and below) makes type feel sharp & contemporary, not loose & generic.

3. **Single accent color:** One vermillion spot color per section; no rainbow. This restraint reads as intentional.

4. **Varied section heights:** Sections have different aspect ratios, image placements, and grid layouts. Same grid never repeats three times in a row.

5. **Soft shadows, not harsh borders:** Separation comes from subtle shadows + color alternation, not via 1–2px hard borders. This feels modern.

6. **Alignment discipline:** Elements snap to a clear grid. Cards don't have random margins; they use consistent gap spacing. This creates invisible structure that the eye recognizes as "controlled."

7. **Type pairing:** Only "NB International Pro" (neogrotesque) for headings + body. No secondary typeface or serif headers. Consistency = confidence.

8. **Spacing rhythm:** Padding values repeat (3rem, 5rem, 7rem, 10rem), so the layout feels systematic even though composition varies. The system is the premium part.

---

**Key takeaway for Next.js:** Build a `<Section>` component that accepts `padding="lg"` or `padding="medium"`, a `maxWidth` prop, and children. Then compose pages by combining sections with different backgrounds and content layouts. The consistency will emerge from repeating the same spacing + container system, while section-level variety prevents templated feel.

---

## 5. How to apply this to your own site — in priority order

Do these **in order**; each is higher-impact-per-hour than the next. The first two alone will move a site from "templated" to "designed."

### ① Adopt the *one-accent-over-zinc* system (highest impact, lowest effort)

Drop the §2 tokens in, then impose one rule: **zinc carries everything; the brand accent appears exactly once per viewport** (the primary CTA, the active nav item, or the one number you want read first). Never put a second saturated color on screen. This single constraint is 80% of why the reference site looks expensive.

```tsx
// the only loud thing in view
<button className="rounded-full bg-brand-900 px-5 py-3 text-body font-medium
                   text-white shadow-glow transition hover:bg-brand-700">
  Get started
</button>
// everything else is zinc
<span className="text-body text-zinc-500">Secondary action</span>
```

### ② Fix typography: **big, light, tight** (the other half of "premium")

Headings large and at **weight 400–500** (not bold), with negative tracking; body **small and muted**. This is counter-intuitive — most templated sites make headings *bolder*; restraint reads as confidence.

```tsx
<h1 className="font-sans text-h1 font-normal text-zinc-900">Make the headline calm</h1>
<p  className="mt-4 max-w-prose text-body text-zinc-500">
  Body stays 14–16px and muted, which makes the heading feel larger without growing it.
</p>
<p  className="text-stat font-medium tabular-nums tracking-tight">98%</p> {/* oversized stat */}
```

### ③ Alternate light/dark full-bleed surfaces for scroll rhythm

Wrap every section in one primitive that flips the semantic vars (§2.2). Punctuate the white flow with a `zinc-900` section every 3–4 blocks so the page reads as distinct "rooms." Because components read CSS vars, **nothing inside changes** — only the wrapper's `data-surface`.

```tsx
function Section({ surface = 'light', children }:{ surface?: 'light'|'dark'; children: React.ReactNode }) {
  return (
    <section
      data-surface={surface}
      className="bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      <div className="mx-auto max-w-container px-6 py-24 md:py-32">{children}</div>
    </section>
  );
}
```

### ④ Add *quiet* motion: scroll-reveals + one drifting gradient glow

Two ingredients, both subtle. (a) A reusable reveal — fade + 24px rise, ~0.6s, ease-out, `viewport={{ once: true }}`, staggered for groups. (b) **One** soft gradient blob drifting behind the hero (the CSS/Framer approximation from §3 — you do **not** need WebGL). Keep durations 0.4–0.8s and easing `[0.22,1,0.36,1]`; nothing should bounce.

```tsx
// components/Reveal.tsx — wrap anything
'use client';
import { motion } from 'framer-motion';
export const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
  >
    {children}
  </motion.div>
);
```

Always gate motion on reduced-motion: `const reduce = useReducedMotion();` and skip the transforms when `true`.

### ⑤ Build depth with **soft layered shadows + big radii + backdrop-blur**, not borders

Cards: `rounded-3xl` + `shadow-card`, with a hairline `border-zinc-200` only when a card sits on white. Sticky/overlay chrome (nav, announcement bar, video controls): translucent background + `backdrop-blur` instead of a solid fill — that's the "glass" depth cue.

```tsx
// card
<div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-card">…</div>
// glass nav
<nav className="sticky top-0 z-50 h-navbar border-b border-zinc-200/60
                bg-white/70 backdrop-blur-glass">…</nav>
```

---

### What to skip / not over-do

- **Don't reach for WebGL** (UnicornStudio) unless a hero genuinely needs it — the layered-radial-gradient + `blur()` + slow `translate` approximation is 95% of the effect at 1% of the cost and weight.
- **One accent, period.** The neon green/pink/yellow in the palette are for *tiny* data accents (a chart dot, a status pill), never surfaces or buttons.
- **License the font.** NB International Pro is commercial (Neubau). Substitute a free near-grotesque (Inter Tight, Geist, Hanken Grotesk) and keep the *treatment* (size/weight/tracking) — the treatment matters more than the exact face.
- **Respect `prefers-reduced-motion`** on every reveal, blob, and split-text entrance.
- **Keep the container at 80rem and text columns at ~45rem.** Wide containers with narrow text columns + generous `py-24/py-32` are most of the "whitespace = premium" effect.

---

*Reference screenshots live in `design-screenshots/` (`superpower-desktop-1440.png` full-page @1440, `superpower-mobile-390.png` full-page @390). The Playwright capture script is saved next to them at `design-screenshots/capture.mjs` — change the `URL` constant and run `node design-screenshots/capture.mjs` to capture computed styles + full-page shots of any site.*

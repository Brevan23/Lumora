// Shared motion language for the whole site. Re-tune the feel of every animation
// from this one file — that single source of truth is what makes the motion read
// as cohesive and intentional rather than a pile of one-off effects.
import type { Transition } from "framer-motion";

/** Warm ease-out for entrances / reveals (quick out, soft settle). */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Gentle ease-in-out for symmetric morphs. */
export const EASE_IN_OUT: [number, number, number, number] = [0.45, 0, 0.2, 1];

export const DURATION = { fast: 0.3, base: 0.6, slow: 0.9 } as const;

/**
 * Spring presets. `scroll` smooths scroll-linked MotionValues so they feel
 * weighted and buttery (never linear/robotic); `hover` gives micro-interactions
 * a touch of life; `soft` is for larger, slower moves.
 */
export const SPRING = {
  scroll: { stiffness: 110, damping: 30, mass: 0.6, restDelta: 0.0004 },
  hover: { stiffness: 320, damping: 22, mass: 0.6 },
  soft: { stiffness: 90, damping: 26, mass: 0.9 },
} as const;

/** whileInView viewport: animate ONCE, a touch before the element is fully in view. */
export const VIEWPORT = { once: true, margin: "-100px" } as const;

/** Standard reveal transition (fade + rise). */
export const revealTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

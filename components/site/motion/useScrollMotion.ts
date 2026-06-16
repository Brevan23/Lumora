"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * True only when scroll-linked motion should actually run: a large screen AND the
 * user has not requested reduced motion. The heavy scroll effects (ScrollScaleImage,
 * Parallax) call this and fall back to a static render otherwise — that keeps
 * mobile smooth (60fps) and respects prefers-reduced-motion.
 *
 * Defaults to `true` so SSR + first client render match; the media query corrects
 * it after mount (a static->static transition, no layout shift).
 */
export function useScrollMotion(): boolean {
  const reduce = useReducedMotion();
  const [large, setLarge] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setLarge(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return !reduce && large;
}

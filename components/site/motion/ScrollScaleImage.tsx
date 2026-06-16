"use client";
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { useScrollMotion } from "./useScrollMotion";

/**
 * The hero effect: subtly scales its child as the element travels through the
 * viewport — smallest at the edges, peaking near centre — smoothed with a spring
 * so it feels weighted, not linear. Optional opacity fade at the edges.
 *
 * Animates transform/opacity ONLY. Disabled (renders static) for reduced-motion
 * and on small screens, via useScrollMotion().
 *
 * Tune intensity with `scaleEdge` / `scalePeak` (keep the spread small — ~0.1 is
 * already very visible). `fade` adds a gentle edge opacity falloff.
 */
export function ScrollScaleImage({
  children,
  className,
  scaleEdge = 0.94,
  scalePeak = 1.04,
  fade = false,
}: {
  children: ReactNode;
  className?: string;
  scaleEdge?: number;
  scalePeak?: number;
  fade?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useScrollMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scaleRaw = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [scaleEdge, scalePeak, scaleEdge],
  );
  const opacityRaw = useTransform(
    scrollYProgress,
    [0, 0.18, 0.82, 1],
    [0.55, 1, 1, 0.55],
  );
  const scale = useSpring(scaleRaw, SPRING.scroll);
  const opacity = useSpring(opacityRaw, SPRING.scroll);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={enabled ? { scale, ...(fade ? { opacity } : {}) } : undefined}
    >
      {children}
    </motion.div>
  );
}

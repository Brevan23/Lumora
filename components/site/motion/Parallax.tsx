"use client";
import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { useScrollMotion } from "./useScrollMotion";

/**
 * Drifts its child on the Y axis at a different rate than scroll, for depth.
 * `speed` is the intensity: positive drifts the element up as you scroll past it,
 * negative drifts it down. Spring-smoothed, transform-only, and disabled (static)
 * for reduced-motion / small screens.
 *
 * Keep `speed` low (0.1–0.4) — parallax is most premium when you barely notice it.
 */
export function Parallax({
  children,
  className,
  speed = 0.3,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useScrollMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yRaw = useTransform(scrollYProgress, [0, 1], [speed * 60, speed * -60]);
  const y = useSpring(yRaw, SPRING.scroll);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={enabled ? { y } : undefined}
    >
      {children}
    </motion.div>
  );
}

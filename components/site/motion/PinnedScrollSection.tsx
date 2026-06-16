"use client";
import { useRef, type ReactNode } from "react";
import { motion, useScroll, type MotionValue } from "framer-motion";

/**
 * A tall section whose inner content is sticky and animates as the user scrolls
 * past it — the "image transforms as you scroll" showcase. `children` is a
 * render-prop that receives `scrollYProgress` (0 → 1 across the section), so you
 * can drive any transform/opacity from it (ideally smoothed with useSpring and
 * gated on prefers-reduced-motion in the consumer).
 *
 * `heightVh` controls how much scroll distance the sequence spans (taller = the
 * transform unfolds more slowly). Reusable; not yet placed on the page — see
 * MOTION_NOTES.md for a ready-to-drop usage example.
 */
export function PinnedScrollSection({
  children,
  className,
  heightVh = 250,
}: {
  children: (progress: MotionValue<number>) => ReactNode;
  className?: string;
  heightVh?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <motion.section
      ref={ref}
      style={{ height: `${heightVh}vh` }}
      className={className}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {children(scrollYProgress)}
      </div>
    </motion.section>
  );
}

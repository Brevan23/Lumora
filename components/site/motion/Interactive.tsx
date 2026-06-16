"use client";
import { motion, useReducedMotion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import type { ReactNode } from "react";

/**
 * Card wrapper with a subtle spring lift on hover + a slight press on tap.
 * Transform-only (never animates shadow/layout). `lift` is the hover rise in px.
 * No-ops for reduced-motion.
 */
export function MotionCard({
  children,
  className,
  lift = 6,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduce ? undefined : { y: -lift, scale: 1.012 }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={SPRING.hover}
    >
      {children}
    </motion.div>
  );
}

/**
 * Button/link wrapper: a spring lift on hover + press on tap. Wrap an <a>/<button>
 * — keep the button's own classes for colour/glow; this adds the weighted motion.
 * Transform-only. No-ops for reduced-motion or when `disabled`.
 */
export function MotionButton({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const active = !reduce && !disabled;
  return (
    <motion.div
      className={`inline-flex ${className ?? ""}`}
      whileHover={active ? { y: -2, scale: 1.025 } : undefined}
      whileTap={active ? { scale: 0.97 } : undefined}
      transition={SPRING.hover}
    >
      {children}
    </motion.div>
  );
}

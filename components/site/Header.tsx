"use client";
import { useEffect, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Transition,
} from "framer-motion";
import { BRAND } from "@/lib/constants";
import { EASE_OUT } from "@/lib/motion";
import { MotionButton } from "./motion/Interactive";

const IVORY = "251,247,240"; // #FBF7F0
const LINE = "236,227,212"; // #ECE3D4

/**
 * Morphing site header. At the very top of the page it's a full-width bar pinned
 * to the top edge — transparent over the dark hero, solid ivory otherwise. As
 * soon as you scroll down it condenses into a centered, rounded "floating pill"
 * (~2/3 width, detached from the top) and stays a pill until you scroll all the
 * way back to the top, where it merges into the full bar again. Every property
 * (size, position, radius, background, border, shadow) animates together so the
 * merge reads as one smooth morph — nothing pops on or off.
 */
export function Header({ overHero = false }: { overHero?: boolean }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [atTop, setAtTop] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useMotionValueEvent(scrollY, "change", (y) => {
    setAtTop(y < 10); // "at the very top" — only here does the pill merge to the bar
  });

  const expanded = atTop;
  const solid = !(overHero && atTop);

  const transition: Transition = reduce
    ? { duration: 0 }
    : {
        duration: 0.62,
        ease: EASE_OUT,
        // Fill / border / shadow fade more slowly than the shape morphs, so the
        // merge-to-top feels softer rather than snapping its chrome on and off.
        backgroundColor: { duration: 0.95, ease: "easeInOut" },
        borderColor: { duration: 0.95, ease: "easeInOut" },
        boxShadow: { duration: 0.95, ease: "easeInOut" },
      };

  // One animation target covering shape AND chrome, so it all morphs as a unit.
  const surface = expanded
    ? {
        width: "100%",
        top: 0,
        height: 84,
        borderRadius: 0,
        backgroundColor: `rgba(${IVORY},${solid ? 0.82 : 0})`,
        borderColor: `rgba(${LINE},${solid ? 0.7 : 0})`,
        boxShadow: "0 20px 40px -20px rgba(30,27,22,0)",
      }
    : {
        width: isDesktop ? "66%" : "92%",
        top: 14,
        height: 56,
        borderRadius: 9999,
        backgroundColor: `rgba(${IVORY},0.86)`,
        borderColor: `rgba(${LINE},0.9)`,
        boxShadow: "0 20px 40px -20px rgba(30,27,22,0.28)",
      };

  return (
    <motion.header
      style={{ x: "-50%" }}
      initial={false}
      animate={surface}
      transition={transition}
      className={`fixed left-1/2 top-0 z-50 border border-transparent ${
        solid ? "backdrop-blur-md" : ""
      }`}
    >
      <div className="container-content flex h-full items-center justify-between gap-4">
        <motion.a
          href="#top"
          initial={false}
          animate={{ scale: expanded ? 1 : 0.92 }}
          transition={transition}
          style={{ transformOrigin: "left center" }}
          className={`font-display text-2xl font-semibold tracking-tight transition-colors duration-300 ${
            solid ? "text-ink" : "text-ivory"
          }`}
        >
          {BRAND}
        </motion.a>
        <nav
          aria-label="Primary"
          className={`hidden items-center gap-8 whitespace-nowrap text-sm font-medium transition-colors duration-300 md:flex ${
            solid ? "text-muted" : "text-ivory/85"
          }`}
        >
          <a href="#how" className="transition-opacity hover:opacity-70">
            How It Works
          </a>
          <a href="#gallery" className="transition-opacity hover:opacity-70">
            Gallery
          </a>
          <a href="#faq" className="transition-opacity hover:opacity-70">
            FAQ
          </a>
        </nav>
        <MotionButton>
          <a href="#create" className="btn-primary !px-5 !py-2 text-sm">
            Create yours
          </a>
        </MotionButton>
      </div>
    </motion.header>
  );
}

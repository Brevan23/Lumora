"use client";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronIcon } from "./icons";
import { Reveal } from "./motion/Reveal";
import { EASE_OUT } from "@/lib/motion";
import { FRAME_LABEL, PRODUCTION_DAYS } from "@/lib/constants";

const FAQS = [
  {
    q: "What photos work best?",
    a: "Clear, well-lit photos with good contrast and a defined subject look best — close-ups of faces, pets, or simple backgrounds really shine. Very dark or low-resolution photos will show less detail in the light.",
  },
  {
    q: "How does delivery work?",
    a: `We hand-make and ship your lithophane within an estimated ${PRODUCTION_DAYS} business days, with free shipping across Canada.`,
  },
  {
    q: "What size is the frame?",
    a: `Each lithophane is ${FRAME_LABEL} (about 13 × 18 cm) in portrait orientation — a generous, displayable keepsake.`,
  },
  {
    q: "What is your return policy?",
    a: "We offer 30-day returns. If something isn't right with your order, reach out and we'll make it good.",
  },
  {
    q: "How do I send my photo?",
    a: "You upload and crop your photo right here on this page before checkout — no email needed. We receive it automatically, attached to your order.",
  },
] as const;

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-line bg-ivory py-20 md:py-28"
    >
      <div className="container-content max-w-3xl">
        <Reveal>
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
            Questions, answered
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-button-${i}`;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl bg-sand/70 shadow-soft"
              >
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:text-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber"
                  >
                    <span className="font-display text-lg font-medium">
                      {item.q}
                    </span>
                    <ChevronIcon
                      className={`shrink-0 text-muted transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      key="content"
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: reduce ? 0 : 0.4,
                        ease: EASE_OUT,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 leading-relaxed text-muted">
                        {item.a}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

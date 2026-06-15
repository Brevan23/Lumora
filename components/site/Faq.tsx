"use client";
import { useState } from "react";
import { ChevronIcon } from "./icons";
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

  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-ivory py-20">
      <div className="container-content max-w-3xl">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
          Questions, answered
        </h2>

        <div className="mt-10 border-t border-line">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const btnId = `faq-button-${i}`;
            return (
              <div key={item.q} className="border-b border-line">
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-amber-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-4 focus-visible:ring-offset-ivory"
                  >
                    <span className="font-display text-lg font-medium">
                      {item.q}
                    </span>
                    <ChevronIcon
                      className={`shrink-0 text-muted transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                  className="pb-5 pr-8 leading-relaxed text-muted"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { BRAND, CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/constants";
import { Reveal } from "./motion/Reveal";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-[#2a2118] text-ivory">
      {/* Melt the light section above into the dark footer (ivory -> footer bg),
          so it reads as a gentle deepening rather than a hard division. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sand to-[#2a2118]"
      />
      <div className="container-content relative pb-16 pt-32">
        <Reveal className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight">
              {BRAND}
            </p>
            <p className="mt-2 max-w-xs text-sm text-ivory/55">
              Hand-crafted custom photo lithophanes. Made in Canada.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-ivory/70">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="transition-colors hover:text-ivory"
            >
              {CONTACT_EMAIL}
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-ivory"
            >
              Instagram
            </a>
          </div>
        </Reveal>
        <div className="mt-10 border-t border-ivory/10 pt-6 text-xs text-ivory/45">
          © {year} {BRAND}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

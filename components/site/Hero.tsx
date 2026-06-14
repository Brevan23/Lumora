import { GlowFrame } from "./GlowFrame";
import { TrustStrip } from "./TrustStrip";
import { formatMoney } from "@/lib/format";
import { PRICE_CENTS, ANCHOR_PRICE_CENTS } from "@/lib/constants";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="container-content grid items-center gap-12 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="animate-fade-up">
          <p className="eyebrow">Custom photo lithophanes · Made in Canada</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.04] tracking-tight text-balance md:text-6xl">
            A photo that <span className="text-amber-deep">glows</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted text-pretty">
            We turn your favourite photo into a hand-crafted lithophane — an
            image hidden in the light, revealed the moment it&rsquo;s lit. A
            keepsake they&rsquo;ll keep forever.
          </p>

          <div className="mt-7 flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-ink">
              {formatMoney(PRICE_CENTS)}
            </span>
            <span className="text-lg text-muted line-through">
              {formatMoney(ANCHOR_PRICE_CENTS)}
            </span>
            <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink">
              Free shipping
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#create" className="btn-primary">
              Create yours
            </a>
            <a href="#how" className="btn-secondary">
              How it works
            </a>
          </div>

          <TrustStrip className="mt-9" />
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-up">
          <div
            className="absolute -inset-6 -z-10 rounded-[2rem] bg-amber/20 blur-3xl animate-glowpulse"
            aria-hidden="true"
          />
          {/* TODO: replace with a looping hero video / real lithophane photo at /public/hero.jpg */}
          <GlowFrame alt="A glowing photo lithophane lit from behind" priority />
        </div>
      </div>
    </section>
  );
}

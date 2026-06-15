import { GlowFrame } from "./GlowFrame";
import { TrustStrip } from "./TrustStrip";
import { formatMoney } from "@/lib/format";
import { PRICE_CENTS, ANCHOR_PRICE_CENTS } from "@/lib/constants";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[92vh] items-center overflow-hidden bg-espresso text-ivory"
    >
      {/* Large dynamic background — a glow rising out of the dark. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-glow-core absolute left-1/2 top-1/2 h-[125vh] w-[125vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl animate-glowdrift" />
        <div className="hero-glow-accent absolute right-[6%] top-[12%] h-[55vh] w-[55vh] rounded-full blur-3xl animate-glowpulse" />
        {/* subtle vignette for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgba(10,8,6,0.55))]" />
      </div>

      <div className="container-content grid items-center gap-12 py-28 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="animate-fade-up">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-soft">
            Custom photo lithophanes · Made in Canada
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-tight text-balance sm:text-6xl md:text-7xl">
            A photo that <span className="text-amber">glows</span>.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ivory/70 text-pretty">
            We turn your favourite photo into a hand-crafted lithophane — an
            image hidden in the light, revealed the moment it&rsquo;s lit.
          </p>

          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold">
              {formatMoney(PRICE_CENTS)}
            </span>
            <span className="text-lg text-ivory/50 line-through">
              {formatMoney(ANCHOR_PRICE_CENTS)}
            </span>
            <span className="rounded-full bg-ivory/10 px-3 py-1 text-xs font-semibold text-ivory ring-1 ring-inset ring-ivory/15">
              Free shipping
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#create" className="btn-primary">
              Create yours
            </a>
            <a href="#how" className="btn-ghost-light">
              How it works
            </a>
          </div>

          <TrustStrip className="mt-10" onDark />
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-fade-up">
          <div
            className="absolute -inset-10 -z-10 rounded-full bg-amber/25 blur-3xl animate-glowpulse"
            aria-hidden="true"
          />
          {/* TODO: swap for a looping hero video / real lithophane photo */}
          <div className="overflow-hidden rounded-[1.5rem] shadow-2xl ring-1 ring-inset ring-ivory/15">
            <GlowFrame alt="A glowing photo lithophane lit from behind" priority />
          </div>
        </div>
      </div>
    </section>
  );
}

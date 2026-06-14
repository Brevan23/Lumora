import { GlowFrame } from "./GlowFrame";

// Placeholder slots. Drop real photos into /public/gallery and set `src` (e.g.
// src="/gallery/wedding.jpg") to replace each glow placeholder.
const EXAMPLES = [
  { caption: "A wedding day", src: undefined as string | undefined },
  { caption: "First steps", src: undefined as string | undefined },
  { caption: "Best friends", src: undefined as string | undefined },
  { caption: "Grandparents", src: undefined as string | undefined },
  { caption: "The proposal", src: undefined as string | undefined },
  { caption: "A new arrival", src: undefined as string | undefined },
];

export function Gallery() {
  return (
    <section id="gallery" className="scroll-mt-20 bg-sand/40 py-20">
      <div className="container-content">
        <div className="max-w-xl">
          <p className="eyebrow">Gallery</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
            Moments, turned to light
          </h2>
          <p className="mt-3 text-muted text-pretty">
            A few of the kinds of photos that come alive as a lithophane.
          </p>
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {EXAMPLES.map((ex, i) => (
            <li key={ex.caption}>
              <GlowFrame
                src={ex.src}
                alt={`Example lithophane — ${ex.caption}`}
                caption={ex.caption}
                priority={i === 0}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

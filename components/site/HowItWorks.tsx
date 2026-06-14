import { UploadIcon, CraftIcon, GlowIcon } from "./icons";

const STEPS = [
  {
    Icon: UploadIcon,
    title: "Upload Your Photo",
    body: "Pick any photo and crop it to the frame, right here in your browser. JPG, PNG, or iPhone HEIC — all welcome.",
  },
  {
    Icon: CraftIcon,
    title: "We Print and Craft",
    body: "We hand-make your lithophane in fine relief, so every shade of your photo is carved into the light.",
  },
  {
    Icon: GlowIcon,
    title: "It Glows for You",
    body: "Set it by a lamp or window. In the light, your photo appears — a quiet, glowing keepsake.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-t border-line bg-ivory py-20">
      <div className="container-content">
        <div className="max-w-xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-balance">
            From a photo to a glow in three steps
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              className="rounded-3xl border border-line bg-white p-7 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-amber-deep">
                  <Icon width={22} height={22} />
                </span>
                <span className="font-display text-sm font-semibold text-muted">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

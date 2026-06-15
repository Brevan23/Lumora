import Image from "next/image";

interface GlowFrameProps {
  /** Real photo path under /public. When omitted, a styled glow placeholder renders. */
  src?: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  className?: string;
}

/**
 * The signature lithophane visual: a backlit portrait card in the 17:22 frame
 * ratio. With no `src` it renders a premium glow placeholder (no broken image),
 * leaving a clearly-named slot for a real photo.
 */
export function GlowFrame({
  src,
  alt,
  caption,
  priority,
  className,
}: GlowFrameProps) {
  return (
    <figure className={className}>
      <div
        className="glow-card aspect-[5/7] shadow-glow"
        {...(!src ? { role: "img", "aria-label": alt } : {})}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 768px) 80vw, 460px"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="glow-card__placeholder" aria-hidden="true" />
        )}
        <div className="glow-card__frame" />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-sm text-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

"use client";
import { useId } from "react";

/**
 * Illuminate Memories brand mark — a glowing amber bracketed-serif "I" beacon on
 * an espresso badge. Same artwork as the favicon (app/icon.svg). The badge is
 * #16120E, so over the espresso hero it melts away and only the glowing "I"
 * shows; on light surfaces the full dark badge reads. Gradient ids are made
 * unique per instance so the mark can appear several times on one page (header,
 * footer, ...) without id collisions.
 *
 * When placed next to the visible wordmark, pass `decorative` so screen readers
 * don't announce the brand name twice.
 */
export function BrandMark({
  size = 32,
  className,
  title = "Illuminate Memories",
  decorative = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  decorative?: boolean;
}) {
  const uid = useId().replace(/:/g, ""); // colons are unsafe inside url(#...) refs
  const halo = `${uid}-halo`;
  const metal = `${uid}-metal`;
  const bloom = `${uid}-bloom`;
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": title } as const);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      className={className}
      {...a11y}
    >
      {decorative ? null : <title>{title}</title>}
      <defs>
        <radialGradient id={halo} gradientUnits="userSpaceOnUse" cx="256" cy="248" r="222">
          <stop offset="0%" stopColor="rgb(224,161,64)" stopOpacity="0.55" />
          <stop offset="50%" stopColor="rgb(224,161,64)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(224,161,64)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={metal} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EBC07E" />
          <stop offset="46%" stopColor="#E0A140" />
          <stop offset="100%" stopColor="#C7842A" />
        </linearGradient>
        <radialGradient id={bloom} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF4DE" stopOpacity="0.95" />
          <stop offset="42%" stopColor="#FFF4DE" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF4DE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="512" height="512" rx="116" fill="#16120E" />
      <rect x="0" y="0" width="512" height="512" fill={`url(#${halo})`} />
      <path
        d="M128 74 L384 74 L384 106 C336 106 294 110 294 130 L294 382 C294 402 340 406 384 406 L384 438 L128 438 L128 406 C172 406 218 402 218 382 L218 130 C218 110 176 106 128 106 Z"
        fill={`url(#${metal})`}
      />
      <ellipse cx="256" cy="256" rx="44" ry="150" fill={`url(#${bloom})`} />
    </svg>
  );
}

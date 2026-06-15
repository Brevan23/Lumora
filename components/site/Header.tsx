"use client";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/constants";

/**
 * Site header. When `overHero` is set (the landing page), it floats transparent
 * with light text over the dark hero, then turns solid ivory once you scroll
 * past the hero. Elsewhere it's solid from the start.
 */
export function Header({ overHero = false }: { overHero?: boolean }) {
  const [solid, setSolid] = useState(!overHero);

  useEffect(() => {
    if (!overHero) {
      setSolid(true);
      return;
    }
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid
          ? "border-b border-line/70 bg-ivory/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="container-content flex h-16 items-center justify-between gap-4">
        <a
          href="#top"
          className={`font-display text-2xl font-semibold tracking-tight transition-colors ${
            solid ? "text-ink" : "text-ivory"
          }`}
        >
          {BRAND}
        </a>
        <nav
          aria-label="Primary"
          className={`hidden items-center gap-8 text-sm font-medium transition-colors md:flex ${
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
        <a href="#create" className="btn-primary !px-5 !py-2 text-sm">
          Create yours
        </a>
      </div>
    </header>
  );
}

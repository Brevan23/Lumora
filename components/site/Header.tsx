import { BRAND } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/80 backdrop-blur-md">
      <div className="container-content flex h-16 items-center justify-between gap-4">
        <a
          href="#top"
          className="font-display text-2xl font-semibold tracking-tight text-ink"
        >
          {BRAND}
        </a>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 text-sm font-medium text-muted md:flex"
        >
          <a href="#how" className="transition-colors hover:text-ink">
            How It Works
          </a>
          <a href="#gallery" className="transition-colors hover:text-ink">
            Gallery
          </a>
          <a href="#faq" className="transition-colors hover:text-ink">
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

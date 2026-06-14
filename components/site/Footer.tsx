import { BRAND, CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/constants";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-ivory py-14">
      <div className="container-content flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">
            {BRAND}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Hand-crafted custom photo lithophanes. Made in Canada.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors hover:text-ink"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            Instagram
          </a>
        </div>
      </div>
      <div className="container-content mt-10 border-t border-line pt-6 text-xs text-muted">
        © {year} {BRAND}. All rights reserved.
      </div>
    </footer>
  );
}

import { TruckIcon, ShieldIcon, LeafIcon } from "./icons";

const ITEMS = [
  { label: "Free shipping", Icon: TruckIcon },
  { label: "30-day returns", Icon: ShieldIcon },
  { label: "Made in Canada", Icon: LeafIcon },
] as const;

export function TrustStrip({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium ${
        onDark ? "text-ivory/70" : "text-muted"
      } ${className ?? ""}`}
    >
      {ITEMS.map(({ label, Icon }) => (
        <li key={label} className="flex items-center gap-2">
          <Icon className={onDark ? "text-amber-soft" : "text-amber-deep"} />
          {label}
        </li>
      ))}
    </ul>
  );
}

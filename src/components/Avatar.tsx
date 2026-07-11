/**
 * src/components/Avatar.tsx
 * Small initial-in-a-circle monogram — used anywhere an identity (a user, a
 * team) needs a visual anchor without a photo/flag asset. Deliberately
 * neutral (not tier-colored): tier color is reserved for Moment rarity, and
 * reusing it here would blur that meaning.
 */

interface Props {
  name: string;
  size?: "sm" | "md";
}

export function Avatar({ name, size = "md" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-surface-overlay border border-surface-border text-ink-secondary font-bold font-display ${sizeClass}`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

import { icons, type LucideIcon, type LucideProps } from "lucide-react";

/** Lucide ikon adları (PascalCase) — ücretsiz MIT lisanslı kütüphane */
export const LUCIDE_ICON_NAMES = Object.keys(icons).sort((a, b) =>
  a.localeCompare(b),
) as string[];

export function getLucideIcon(name?: string | null): LucideIcon | null {
  if (!name) return null;
  const Icon = icons[name as keyof typeof icons];
  return Icon ?? null;
}

export function LucideIconByName({
  name,
  ...props
}: { name?: string | null } & LucideProps) {
  const Icon = getLucideIcon(name);
  if (!Icon) return null;
  return <Icon {...props} />;
}

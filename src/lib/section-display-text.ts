/** Boşlukları temizler; boş metin için undefined döner (sitede gösterilmez). */
export function normalizeSectionText(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

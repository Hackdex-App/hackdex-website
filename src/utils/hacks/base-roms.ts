import { baseRoms } from "@/data/baseRoms";

export function uniqueBaseRomIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function resolveHackBaseRomIds(
  primary: string | null | undefined,
  extras?: Array<string | null | undefined> | null,
): string[] {
  return uniqueBaseRomIds([primary, ...(extras ?? [])]);
}

export function baseRomName(id: string | null | undefined): string {
  if (!id) return "Unknown";
  return baseRoms.find((rom) => rom.id === id)?.name ?? id;
}

export function listBaseRomNames(ids: string[]): string[] {
  return uniqueBaseRomIds(ids).map(baseRomName);
}

export function formatBaseRomNames(ids: string[]): string {
  const names = listBaseRomNames(ids);
  if (names.length === 0) return "Unknown";
  if (names.length <= 2) return names.join(", ");
  return `${names[0]} + ${names.length - 1} more`;
}

export function shortBaseRomName(id: string | null | undefined): string {
  return baseRomName(id).replace(/^Pokémon\s+/i, "");
}

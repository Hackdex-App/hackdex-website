export const MAX_MULTI_BASE_ROMS = 10;
export const MAX_MULTI_PATCHES = 30;

export function isMultiEntryHack(args: {
  baseRomCount?: number;
  patches: Array<{ version?: string | null; archived?: boolean | null; label?: string | null }>;
}): boolean {
  if ((args.baseRomCount ?? 0) > 1) return true;
  const versionCounts = new Map<string, number>();
  for (const patch of args.patches) {
    if (patch.archived) continue;
    if ((patch.label ?? "").trim()) return true;
    const version = patch.version ?? "";
    const next = (versionCounts.get(version) ?? 0) + 1;
    if (next > 1) return true;
    versionCounts.set(version, next);
  }
  return false;
}

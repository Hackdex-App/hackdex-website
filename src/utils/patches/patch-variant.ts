export const PATCH_LABEL_MAX_LENGTH = 48;
export const PATCH_INFO_MAX_LENGTH = 500;

export function normalizePatchLabel(label: string | null | undefined): string {
  return (label ?? "").trim();
}

export function normalizePatchInfo(info: string | null | undefined): string {
  return (info ?? "").trim();
}

export function prependChangelog(
  prefix: string | null | undefined,
  changelog: string | null | undefined,
): string | null {
  const head = (prefix ?? "").trim();
  const body = (changelog ?? "").trim();
  if (head && body) return `${head}\n\n${body}`;
  return head || body || null;
}

export function patchDisplayName(patch: {
  version: string;
  label?: string | null;
}): string {
  const label = normalizePatchLabel(patch.label);
  return label || patch.version;
}

export function currentPatchVersion(
  currentPatchId: number | null,
  patches: Array<{ id: number; version: string }>,
): string | null {
  if (currentPatchId == null) return null;
  return patches.find((patch) => patch.id === currentPatchId)?.version ?? null;
}

export function isCurrentVersionPatch(
  patch: { version: string; archived?: boolean; published?: boolean },
  currentVersion: string | null,
): boolean {
  return currentVersion != null
    && !patch.archived
    && patch.published !== false
    && patch.version === currentVersion;
}

export function patchPickerSubtitle(patch: {
  version: string;
  label?: string | null;
  baseRomName?: string | null;
}): string | null {
  const label = normalizePatchLabel(patch.label);
  const parts: string[] = [];
  if (label) parts.push(patch.version);
  if (patch.baseRomName) parts.push(`Base ROM: ${patch.baseRomName}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export const CUSTOM_VERSION_NAME_MAX_LENGTH = 12;

interface ResolveHackDisplayVersionArgs {
  isArchive: boolean;
  isCustomPatcherActive: boolean;
  customVersionName?: string | null;
  customDefaultPatchVersion?: string | null;
  currentPatchVersion?: string | null;
}

export function resolveHackDisplayVersion({
  isArchive,
  isCustomPatcherActive,
  customVersionName,
  customDefaultPatchVersion,
  currentPatchVersion,
}: ResolveHackDisplayVersionArgs) {
  if (isArchive) return "Archive";
  if (isCustomPatcherActive) {
    return customVersionName?.trim()
      || customDefaultPatchVersion
      || currentPatchVersion
      || "";
  }
  return currentPatchVersion || "";
}

export function suggestCustomVersionName(versionLabels: string[]) {
  if (versionLabels.length === 0) return null;

  let prefix = versionLabels[0];
  for (const label of versionLabels.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < label.length && prefix[index] === label[index]) {
      index += 1;
    }
    prefix = prefix.slice(0, index);
    if (!prefix) return null;
  }

  const suggestion = prefix
    .replace(/[-_.+ ]+$/g, "")
    .trim()
    .slice(0, CUSTOM_VERSION_NAME_MAX_LENGTH);
  return suggestion || null;
}

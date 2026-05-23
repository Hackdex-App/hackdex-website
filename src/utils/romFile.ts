import type { Platform } from "@/data/baseRoms";
import { platformAccept, platformAcceptAll } from "@/utils/idb";

const ARCHIVE_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".gz",
  ".gzip",
  ".bz2",
  ".xz",
  ".cab",
]);

export function getFileExtension(name: string): string {
  const lower = name.toLowerCase();
  const lastDot = lower.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return lower.slice(lastDot);
}

export function isArchiveFile(name: string): boolean {
  return ARCHIVE_EXTENSIONS.has(getFileExtension(name));
}

function platformExtensions(platform: Platform): string[] {
  return platformAccept(platform)
    .split(",")
    .map((ext) => ext.trim())
    .filter(Boolean);
}

/** Any extension Hackdex accepts across all platforms (.gb, .gbc, .gba, .nds). */
export function isAnyRomExtension(name: string): boolean {
  const ext = getFileExtension(name);
  if (!ext) return false;
  return platformAcceptAll()
    .split(",")
    .map((e) => e.trim())
    .includes(ext);
}

export function formatRequiredRomExtension(platform: Platform): string {
  const exts = platformExtensions(platform);
  if (exts.length === 0) return "a ROM file";
  if (exts.length === 1) return `a ${exts[0]} file`;
  const formatted = exts.map((ext) => ext).join(" or ");
  return `a ${formatted} file`;
}

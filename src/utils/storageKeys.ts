import { randomBytes } from "node:crypto";
import type { PatchFormat } from "@/utils/patching";

// Storage keys are made on the server so a signed upload URL can only ever
// point inside the hack the caller is allowed to edit.

/** Screenshots live under `${slug}/`. Slugs can't contain "/", so the prefix can't match another hack. */
export function isCoverKeyFor(slug: string, key: string) {
  const rest = key.startsWith(`${slug}/`) ? key.slice(slug.length + 1) : "";
  return /^[A-Za-z0-9._-]+$/.test(rest) && !rest.startsWith(".");
}

/**
 * A fresh patch key. The random suffix keeps two uploads of one version apart
 * and means nobody can aim an upload at an existing file. Patch keys stay flat
 * (no "/") because the download worker serves them by name.
 */
export function newPatchKey(slug: string, version: string, format: PatchFormat) {
  const safeVersion = version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${slug}-${safeVersion}-${randomBytes(6).toString("hex")}.${format}`;
}

/** Whether a key came from newPatchKey for this hack. */
export function isPatchKeyFor(slug: string, key: string) {
  return key.startsWith(`${slug}-`) && /-[0-9a-f]{12}\.(bps|xdelta)$/.test(key) && /^[A-Za-z0-9._-]+$/.test(key);
}

import { createHmac } from "node:crypto";

/** Aligned with Cloudflare Worker `patchTokenJsonPayload` (key order f, e). */
export function patchTokenJsonPayload(filename: string, expiresAtMs: number): string {
  return JSON.stringify({ f: filename, e: expiresAtMs });
}

const PATCH_DOWNLOAD_TTL_MS = 5 * 60 * 1000;

/** Wire: base64url(utf8 JSON payload).hex(32-byte HMAC-SHA256), matching Worker `mintPatchToken`. */
export function mintPatchDownloadToken(
  filename: string,
  expiresAtMs: number,
  secret: string
): string {
  const buf = Buffer.from(patchTokenJsonPayload(filename, expiresAtMs), "utf8");
  const hexMac = createHmac("sha256", secret).update(buf).digest("hex");
  return `${buf.toString("base64url")}.${hexMac}`;
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * If `PATCH_TOKEN_SECRET` and `PATCHES_DOWNLOAD_BASE_URL` are set, returns a Worker URL with `token`.
 * Otherwise `null` — caller should use Minio `presignedGetObject`.
 */
export function buildPatchDownloadUrl(filename: string): string | null {
  const secret = process.env.PATCH_TOKEN_SECRET?.trim();
  const base = process.env.PATCHES_DOWNLOAD_BASE_URL?.trim();
  if (!secret || !base) return null;
  const expiresAtMs = Date.now() + PATCH_DOWNLOAD_TTL_MS;
  const token = mintPatchDownloadToken(filename, expiresAtMs, secret);
  const u = new URL(filename, `${trimTrailingSlash(base)}/`);
  u.searchParams.set("token", token);
  return u.href;
}

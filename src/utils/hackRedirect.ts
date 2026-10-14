export type HackRedirectResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Checks the redirect an admin enters when deleting a hack. Accepts a full
 * http(s) link or a site path like `/hack/new-slug`; blank means none. Rejects
 * the hack's own pages, which would loop or dead-end.
 */
export function parseHackRedirect(
  input: string,
  slug: string,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
): HackRedirectResult {
  const url = input.trim();
  if (!url) return { ok: true, url: null };

  // A path, but not `//host` or `/\host`, which browsers read as another site.
  const isPath = /^\/(?![/\\])/.test(url);
  if (!isPath && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "Use a full link (https://…) or a path starting with /" };
  }

  let target: URL;
  let site: URL | null = null;
  try {
    site = siteUrl ? new URL(siteUrl) : null;
    target = new URL(url, site ?? "https://hackdex.invalid");
  } catch {
    return { ok: false, error: "That isn't a valid link" };
  }

  // Every page under /hack/<slug> 404s or redirects once it's deleted, and /session loops back here.
  const onThisSite = isPath || target.host === site?.host;
  const ownPath = `/hack/${slug}`.toLowerCase();
  const path = target.pathname.replace(/\/+$/, "").toLowerCase();
  if (onThisSite && (path === ownPath || path.startsWith(`${ownPath}/`))) {
    return { ok: false, error: "That's this hack's own page" };
  }

  return { ok: true, url };
}

export function formatCompactNumber(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export type OrderedTag = { name: string; order: number };

export function sortOrderedTags<T extends OrderedTag>(rows: T[]): T[] {
  return [...rows]
    .filter((t) => !!t.name)
    .sort((a, b) => {
      const aHasOrder = a.order > 0;
      const bHasOrder = b.order > 0;
      if (aHasOrder && !bHasOrder) return -1;
      if (!aHasOrder && bHasOrder) return 1;
      if (aHasOrder && bHasOrder && a.order !== b.order) return a.order - b.order;
      return 0; // fallback to original array order
    });
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[.,!?'"“”‘’\*\(\)]/g, "") // remove common punctuation
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get the public URL for a single cover image
 */
export function getCoverUrl(objectKey: string): string {
  const domain = process.env.NEXT_PUBLIC_HACK_COVERS_DOMAIN;
  if (!domain) {
    throw new Error("NEXT_PUBLIC_HACK_COVERS_DOMAIN environment variable is not set");
  }
  return `${domain}/${objectKey}`;
}

/**
 * Get public URLs for multiple cover images
 */
export function getCoverUrls(objectKeys: string[]): string[] {
  const domain = process.env.NEXT_PUBLIC_HACK_COVERS_DOMAIN;
  if (!domain) {
    throw new Error("NEXT_PUBLIC_HACK_COVERS_DOMAIN environment variable is not set");
  }
  return objectKeys.map(key => `${domain}/${key}`);
}

/** "3 hours ago" inside a day, "4 days ago" inside a week, then "Mar 2025". Used on cards and facts. */
export function formatRelativeDate(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

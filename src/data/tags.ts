import { unstable_cache as cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import type { CatalogTagRow } from "@/types/catalogTag";

/** Must match `revalidateTag()` in src/app/api/tags/refresh/route.ts. */
export const TAGS_CATALOG_CACHE_TAG = "tags-catalog";

const TAGS_CATALOG_REVALIDATE_SECONDS = 86400; // 24 hours

export type { CatalogTagRow };

function mapAndSortTagRows(data: unknown): CatalogTagRow[] {
  const rows: CatalogTagRow[] = ((data as any[]) || []).map((t: any) => ({
    id: t.id as number,
    name: t.name as string,
    category: (t.category ?? null) as string | null,
    popularity: t.usage?.[0]?.count || 0,
  }));
  rows.sort((a, b) => (b.popularity - a.popularity) || a.name.localeCompare(b.name));
  return rows;
}

export async function getCachedTagsWithUsage(): Promise<CatalogTagRow[]> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();
      const { data, error } = await supabase
        .from("tags")
        .select("id,name,category,usage: hack_tags (count)");
      if (error) throw error;
      return mapAndSortTagRows(data);
    },
    ["tags-catalog-v1"],
    { revalidate: TAGS_CATALOG_REVALIDATE_SECONDS, tags: [TAGS_CATALOG_CACHE_TAG] }
  );
  return runner();
}

export function buildTagFilterGroups(rows: CatalogTagRow[]): {
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
} {
  const groups: Record<string, string[]> = {};
  const ungrouped: string[] = [];
  const unique = new Set<string>();
  for (const row of rows) {
    const name = row.name;
    if (unique.has(name)) continue;
    unique.add(name);
    const category = row.category ?? null;
    if (category) {
      if (!groups[category]) groups[category] = [];
      groups[category].push(name);
    } else {
      ungrouped.push(name);
    }
  }
  Object.keys(groups).forEach((k) => groups[k].sort((a, b) => a.localeCompare(b)));
  ungrouped.sort((a, b) => a.localeCompare(b));
  return { tagGroups: groups, ungroupedTags: ungrouped };
}

export function resolveTagIdsInOrder(
  names: string[],
  catalog: CatalogTagRow[]
): { id: number; name: string }[] {
  const byName = new Map(catalog.map((t) => [t.name, t] as const));
  const out: { id: number; name: string }[] = [];
  for (const name of names) {
    const row = byName.get(name);
    if (row) out.push({ id: row.id, name: row.name });
  }
  return out;
}

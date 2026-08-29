import { unstable_cache as cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { sortOrderedTags, type OrderedTag, getCoverUrls } from "@/utils/format";
import { fetchInChunks } from "@/utils/array";
import type { Tables } from "@/types/db";
import type { DiscoverData } from "@/types/discover";
import { resolveHackDisplayVersion } from "@/utils/patches/hack-display-version";

const TRENDING_WINDOW_DAYS = 3;
const DISCOVER_REVALIDATE_SECONDS = 1800;
const CHUNK_SIZE = 150;
const ROW_BATCH_SIZE = 1000;

type HackTagRow = Pick<Tables<"hack_tags">, "hack_slug" | "order"> & {
  tags: Pick<Tables<"tags">, "name">;
};

type PatchRow = Pick<Tables<"patches">, "id" | "parent_hack" | "version" | "published_at">;

function buildTagGroups(rows: Pick<Tables<"tags">, "name" | "category">[]) {
  const tagGroups: Record<string, string[]> = {};
  const ungroupedTags: string[] = [];

  for (const row of rows) {
    if (row.category) {
      (tagGroups[row.category] ??= []).push(row.name);
    } else {
      ungroupedTags.push(row.name);
    }
  }

  for (const tags of Object.values(tagGroups)) {
    tags.sort((a, b) => a.localeCompare(b));
  }
  ungroupedTags.sort((a, b) => a.localeCompare(b));

  return { tagGroups, ungroupedTags };
}

async function generateDiscoverData(): Promise<DiscoverData> {
  const generatedAt = new Date().toISOString();
  const supabase = await createServiceClient();

  const { data: rows, error: hacksError } = await supabase
    .from("hacks")
    .select(
      "slug,title,summary,base_rom,downloads,created_by,current_patch,custom_version_name,original_author,approved_at,is_archive,completion_status",
    )
    .eq("approved", true)
    .eq("is_archive", false);
  if (hacksError) throw hacksError;

  const slugs = rows.map((row) => row.slug);

  const { data: coverRows, error: coversError } = await fetchInChunks(
    slugs,
    CHUNK_SIZE,
    async (slugChunk) => {
      const { data, error } = await supabase
        .from("hack_covers")
        .select("hack_slug,url,position")
        .in("hack_slug", slugChunk)
        .order("position", { ascending: true });
      return { data, error };
    },
  );
  if (coversError) throw coversError;

  const coversBySlug = new Map<string, string[]>();
  if (coverRows.length > 0) {
    const coverKeys = coverRows.map((cover) => cover.url);
    const publicUrls = getCoverUrls(coverKeys);
    const publicUrlByKey = new Map(
      coverKeys.map((key, index) => [key, publicUrls[index]] as const),
    );

    for (const cover of coverRows) {
      const publicUrl = publicUrlByKey.get(cover.url);
      if (!publicUrl) continue;
      const covers = coversBySlug.get(cover.hack_slug) ?? [];
      covers.push(publicUrl);
      coversBySlug.set(cover.hack_slug, covers);
    }
  }

  const { data: tagRows, error: tagsError } = await fetchInChunks<string, HackTagRow>(
    slugs,
    CHUNK_SIZE,
    async (slugChunk) => {
      const chunkRows: HackTagRow[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("hack_tags")
          .select("hack_slug,order,tags(name)")
          .in("hack_slug", slugChunk)
          .range(offset, offset + ROW_BATCH_SIZE - 1)
          .order("hack_slug", { ascending: true });
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;

        chunkRows.push(...data);
        if (data.length < ROW_BATCH_SIZE) break;
        offset += ROW_BATCH_SIZE;
      }

      return { data: chunkRows, error: null };
    },
  );
  if (tagsError) throw tagsError;

  const tagsBySlug = new Map<string, OrderedTag[]>();
  for (const row of tagRows) {
    if (!row.tags?.name) continue;
    const tags = tagsBySlug.get(row.hack_slug) ?? [];
    tags.push({ name: row.tags.name, order: row.order });
    tagsBySlug.set(row.hack_slug, tags);
  }

  const { data: patchRows, error: patchesError } = await fetchInChunks<string, PatchRow>(
    slugs,
    CHUNK_SIZE,
    async (slugChunk) => {
      const chunkRows: PatchRow[] = [];
      let offset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("patches")
          .select("id,parent_hack,version,published_at")
          .in("parent_hack", slugChunk)
          .order("id", { ascending: true })
          .range(offset, offset + ROW_BATCH_SIZE - 1);
        if (error) return { data: null, error };
        if (!data || data.length === 0) break;

        chunkRows.push(...data);
        if (data.length < ROW_BATCH_SIZE) break;
        offset += ROW_BATCH_SIZE;
      }

      return { data: chunkRows, error: null };
    },
  );
  if (patchesError) throw patchesError;

  const patchesById = new Map(patchRows.map((patch) => [patch.id, patch] as const));
  const patchIdsBySlug = new Map<string, number[]>();
  for (const patch of patchRows) {
    if (!patch.parent_hack) continue;
    const patchIds = patchIdsBySlug.get(patch.parent_hack) ?? [];
    patchIds.push(patch.id);
    patchIdsBySlug.set(patch.parent_hack, patchIds);
  }

  const customDefaultVersionsBySlug = new Map<string, string>();
  const customPatcherSlugs = new Set<string>();
  if (slugs.length > 0) {
    const { data: customPatchRows, error: customPatchRowsError } = await supabase
      .from("hack_patcher_patches")
      .select("hack_slug,sort_order,patches!inner(version)")
      .in("hack_slug", slugs)
      .order("sort_order", { ascending: true });
    if (customPatchRowsError) throw customPatchRowsError;

    for (const row of customPatchRows) {
      customPatcherSlugs.add(row.hack_slug);
      if (customDefaultVersionsBySlug.has(row.hack_slug)) continue;
      const patch = Array.isArray(row.patches) ? row.patches[0] : row.patches;
      if (patch?.version) customDefaultVersionsBySlug.set(row.hack_slug, patch.version);
    }
  }

  const since = new Date(generatedAt);
  since.setUTCDate(since.getUTCDate() - TRENDING_WINDOW_DAYS);
  const downloadCounts = await Promise.all(
    [...patchIdsBySlug.entries()].map(async ([slug, patchIds]) => {
      const { count, error } = await supabase
        .from("patch_downloads")
        .select("*", { count: "exact", head: true })
        .in("patch", patchIds)
        .gte("created_at", since.toISOString());
      if (error) throw error;
      return [slug, count ?? 0] as const;
    }),
  );
  const recentDownloadsBySlug = new Map(downloadCounts);

  const { data: catalogTags, error: catalogTagsError } = await supabase
    .from("tags")
    .select("name,category");
  if (catalogTagsError) throw catalogTagsError;
  const { tagGroups, ungroupedTags } = buildTagGroups(catalogTags);

  const creatorIds = [...new Set(rows.map((row) => row.created_by))];
  const { data: profiles, error: profilesError } = await fetchInChunks(
    creatorIds,
    CHUNK_SIZE,
    async (idChunk) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username")
        .in("id", idChunk);
      return { data, error };
    },
  );
  if (profilesError) throw profilesError;
  const usernameById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.username ? `@${profile.username}` : "Unknown",
    ]),
  );

  const hacks = rows.map((row) => {
    const currentPatch = row.current_patch
      ? patchesById.get(row.current_patch)
      : undefined;
    const currentPatchVersion = currentPatch?.version ?? "";
    const downloads = row.downloads ?? 0;
    const recentDownloads = recentDownloadsBySlug.get(row.slug) ?? 0;

    return {
      slug: row.slug,
      title: row.title,
      author: row.original_author || usernameById.get(row.created_by) || "Unknown",
      covers: coversBySlug.get(row.slug) ?? [],
      tags: sortOrderedTags(tagsBySlug.get(row.slug) ?? []),
      downloads,
      baseRomId: row.base_rom,
      version: resolveHackDisplayVersion({
        isArchive: false,
        isCustomPatcherActive: customPatcherSlugs.has(row.slug),
        customVersionName: row.custom_version_name,
        customDefaultPatchVersion: customDefaultVersionsBySlug.get(row.slug),
        currentPatchVersion,
      }),
      summary: row.summary,
      is_archive: false,
      completion_status: row.completion_status,
      approvedAt: row.approved_at,
      publishedAt: currentPatch?.published_at ?? null,
      trendingScore: recentDownloads + 8 * Math.log(downloads + 1),
    };
  });

  return {
    hacks,
    generatedAt,
    tagGroups,
    ungroupedTags,
  };
}

const getCachedDiscoverData = cache(
  generateDiscoverData,
  ["discover-data"],
  {
    revalidate: DISCOVER_REVALIDATE_SECONDS,
    tags: ["discover"],
  },
);

export async function getDiscoverData(): Promise<DiscoverData> {
  return getCachedDiscoverData();
}

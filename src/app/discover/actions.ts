 "use server";

import { unstable_cache as cache } from "next/cache";
import { createServiceClient } from "@/utils/supabase/server";
import { getCachedTagsWithUsage, buildTagFilterGroups } from "@/data/tags";
import { sortOrderedTags, OrderedTag, getCoverUrls } from "@/utils/format";
import { HackCardAttributes } from "@/components/HackCard";
import type { DiscoverSortOption } from "@/types/discover";

const TRENDING_WINDOW_DAYS = 3;
const TIME_TO_LIVE = 600; // 10 minutes

 export interface DiscoverDataResult {
   hacks: HackCardAttributes[];
   tagGroups: Record<string, string[]>;
   ungroupedTags: string[];
 }

 function getDayStamp() {
   const now = new Date();
   const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
   return startOfTodayUtc.toISOString().slice(0, 10); // YYYY-MM-DD
 }

export async function getDiscoverData(sort: DiscoverSortOption): Promise<DiscoverDataResult> {
   const dayStamp = getDayStamp();

    const runner = cache(
      async () => {
        // Must use service role client because cookies cannot be used when caching
        // Viewing permissions are enforced manually (only approved hacks are shown)
        // TODO: Add `published` as a requirement when it's implemented
        const supabase = await createServiceClient();

        // Build base query for hacks (public/anon view: only approved hacks)
        let query = supabase
          .from("hacks")
          .select("slug,title,summary,description,base_rom,downloads,created_by,updated_at,current_patch,original_author,approved_at,is_archive,completion_status")
          .eq("approved", true);

      // Apply sorting based on sort type
      if (sort === "popular") {
        // When sorting by popularity, always show non-archive hacks first.
        // Archives are defined by the `is_archive` flag, so we order by that after downloads.
        query = query
          .order("downloads", { ascending: false })
          .order("is_archive", { ascending: true });
      } else if (sort === "trending") {
        // For trending, we'll fetch all and calculate scores in JS
        // Still order by downloads first for efficiency, then `is_archive` to keep non-archives first.
        query = query
          .order("downloads", { ascending: false })
          .order("is_archive", { ascending: true });
      } else if (sort === "updated") {
        // Will sort by current patch published_at in JS after fetching patches
      } else if (sort === "alphabetical") {
        query = query.order("title", { ascending: true });
      } else {
        // "new" or default
        query = query.order("approved_at", { ascending: false });
      }

       const { data: rows, error: hacksError } = await query;
       if (hacksError) throw hacksError;

       const slugs = (rows || []).map((r) => r.slug);

       // Fetch covers
       const { data: coverRows, error: coversError } = await supabase
         .from("hack_covers")
         .select("hack_slug,url,position")
         .in("hack_slug", slugs)
         .order("position", { ascending: true });
      if (coversError) throw coversError;

      const coversBySlug = new Map<string, string[]>();
      if (coverRows && coverRows.length > 0) {
        const coverKeys = coverRows.map((c) => c.url);
        const urls = getCoverUrls(coverKeys);
        const urlToSignedUrl = new Map<string, string>();
        coverKeys.forEach((key, idx) => {
          if (urls[idx]) urlToSignedUrl.set(key, urls[idx]);
        });

        coverRows.forEach((c) => {
          const arr = coversBySlug.get(c.hack_slug) || [];
          const signed = urlToSignedUrl.get(c.url);
          if (signed) {
            arr.push(signed);
            coversBySlug.set(c.hack_slug, arr);
          }
        });
      }

       // Fetch tags - paginate to avoid 1000 row limit per query
       const tagsBySlug = new Map<string, OrderedTag[]>();
       const BATCH_SIZE = 1000;
       let offset = 0;
       let hasMore = true;

       while (hasMore) {
         const { data: tagRows, error: tagsError } = await supabase
           .from("hack_tags")
           .select("hack_slug,order,tags(name,category)")
           .in("hack_slug", slugs)
           .range(offset, offset + BATCH_SIZE - 1)
           .order("hack_slug", { ascending: true });

         if (tagsError) throw tagsError;

         if (!tagRows || tagRows.length === 0) {
           hasMore = false;
         } else {
           tagRows.forEach((r: any) => {
             if (!r.tags?.name) return;
             const arr = tagsBySlug.get(r.hack_slug) || [];
             arr.push({
               name: r.tags.name,
               order: r.order,
             });
             tagsBySlug.set(r.hack_slug, arr);
           });

           // If we got fewer rows than the batch size, we've reached the end
           if (tagRows.length < BATCH_SIZE) {
             hasMore = false;
           } else {
             offset += BATCH_SIZE;
           }
         }
       }

      // Fetch patches for version mapping
      const patchIds = Array.from(
        new Set(
          (rows || [])
            .map((r: any) => r.current_patch as number | null)
            .filter((id): id is number => typeof id === "number")
        )
      );

      const versionsByPatchId = new Map<number, string>();
      const publishedAtByPatchId = new Map<number, string | null>();
       if (patchIds.length > 0) {
         const { data: patchRows, error: patchesError } = await supabase
           .from("patches")
           .select("id,version,published_at")
           .in("id", patchIds);
        if (patchesError) throw patchesError;

        (patchRows || []).forEach((p: any) => {
          if (typeof p.id === "number") {
            versionsByPatchId.set(p.id, p.version || "Pre-release");
            publishedAtByPatchId.set(p.id, p.published_at ?? null);
          }
        });
      }

      // Calculate trending scores if needed
      let trendingScores: Map<string, number> | null = null;
      if (sort === "trending") {
        // Get all patches for all hacks, grouped by slug
        const { data: allPatches, error: allPatchesError } = await supabase
          .from("patches")
          .select("id,parent_hack")
          .in("parent_hack", slugs);
        if (allPatchesError) throw allPatchesError;

        // Group patch IDs by parent_hack (slug)
        const patchIdsBySlug = new Map<string, number[]>();
        (allPatches || []).forEach((p: any) => {
          if (typeof p.id === "number" && p.parent_hack) {
            const arr = patchIdsBySlug.get(p.parent_hack) || [];
            arr.push(p.id);
            patchIdsBySlug.set(p.parent_hack, arr);
          }
        });

        // Calculate recent downloads over the trending window
        const since = new Date();
        since.setDate(since.getDate() - TRENDING_WINDOW_DAYS);
        const sinceISO = since.toISOString();

        const recentDownloadsBySlug = new Map<string, number>();

        // Query download counts per slug using head: true with count: 'exact'
        // This avoids fetching all download rows and just gets counts
        // One query per slug instead of one per patch
        const downloadCountPromises = Array.from(patchIdsBySlug.entries()).map(async ([slug, patchIds]) => {
          const { count, error } = await supabase
            .from("patch_downloads")
            .select("*", { count: "exact", head: true })
            .in("patch", patchIds)
            .gte("created_at", sinceISO);

          if (error) throw error;
          return { slug, count: count || 0 };
        });

        const downloadCounts = await Promise.all(downloadCountPromises);
        downloadCounts.forEach(({ slug, count }) => {
          recentDownloadsBySlug.set(slug, count);
        });

        // Calculate trending scores: recent_downloads_window + (8 * log(downloads + 1))
        // Give small boost to longer lived popular hacks
        trendingScores = new Map<string, number>();
        (rows || []).forEach((r: any) => {
          const recentDownloads = recentDownloadsBySlug.get(r.slug) || 0;
          const lifetimeDownloads = r.downloads || 0;
          const score = recentDownloads + (8 * Math.log(lifetimeDownloads + 1));
          trendingScores!.set(r.slug, score);
        });
      }

      // Map versions and current patch published_at per hack
      const mappedVersions = new Map<string, string>();
      const publishedAtBySlug = new Map<string, string | null>();
      (rows || []).forEach((r: any) => {
        if (typeof r.current_patch === "number") {
          const version = versionsByPatchId.get(r.current_patch) || "Pre-release";
          mappedVersions.set(r.slug, version);

          const publishedAt = publishedAtByPatchId.get(r.current_patch) ?? null;
          publishedAtBySlug.set(r.slug, publishedAt);
        } else {
          mappedVersions.set(r.slug, r.is_archive ? "Archive" : "Pre-release");
          publishedAtBySlug.set(r.slug, null);
        }
      });

      const catalogTags = await getCachedTagsWithUsage();
      const { tagGroups: groups, ungroupedTags: ungrouped } = buildTagFilterGroups(catalogTags);

      // Fetch profiles for author names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,username");
      if (profilesError) throw profilesError;

      const usernameById = new Map<string, string>();
      (profiles || []).forEach((p) => usernameById.set(p.id, p.username ? `@${p.username}` : "Unknown"));

      // Transform rows to HackCardAttributes
      let mapped = (rows || []).map((r) => ({
        slug: r.slug,
        title: r.title,
        author: r.original_author ? r.original_author : usernameById.get(r.created_by as string) || "Unknown",
        covers: coversBySlug.get(r.slug) || [],
        tags: sortOrderedTags(tagsBySlug.get(r.slug) || []),
        downloads: r.downloads,
        baseRomId: r.base_rom,
        version: mappedVersions.get(r.slug) || "Pre-release",
        summary: r.summary,
        description: r.description,
        is_archive: r.is_archive,
        completion_status: r.completion_status,
      }));

      // Sort by current patch published_at for "updated" sort
      if (sort === "updated") {
        mapped = [...mapped].sort((a, b) => {
          const aPub = publishedAtBySlug.get(a.slug);
          const bPub = publishedAtBySlug.get(b.slug);

          // Nulls (no published_at) go last
          if (!aPub && !bPub) return 0;
          if (!aPub) return 1;
          if (!bPub) return -1;

          const aTime = new Date(aPub).getTime();
          const bTime = new Date(bPub).getTime();

          // Secondary sort: when times are equal, push archives to end
          if (aTime === bTime) {
            if (a.is_archive && !b.is_archive) return 1;
            if (!a.is_archive && b.is_archive) return -1;
          }

          return bTime - aTime; // Descending order (newest first)
        });
      }

      // Sort by trending score if needed
      if (sort === "trending" && trendingScores) {
        mapped = [...mapped].sort((a, b) => {
          const scoreA = trendingScores!.get(a.slug) || 0;
          const scoreB = trendingScores!.get(b.slug) || 0;

          // Secondary sort: push archives to end
          if (scoreA === scoreB) {
            if (a.is_archive && !b.is_archive) return 1;
            if (!a.is_archive && b.is_archive) return -1;
          }

          return scoreB - scoreA; // Descending order
        });
      }

      return {
        hacks: mapped,
        tagGroups: groups,
        ungroupedTags: ungrouped,
      } satisfies DiscoverDataResult;
     },
     [`discover-data:${sort}:${dayStamp}`], // Cache key
     { revalidate: TIME_TO_LIVE, tags: ["discover"] } // Cache duration
   );

   return runner();
 }


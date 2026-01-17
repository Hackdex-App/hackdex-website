"use server";

import { unstable_cache as cache } from "next/cache";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { canEditAsCreator, canEditAsArchiver } from "@/utils/hack";
import { checkUserRoles } from "@/utils/user";

interface SeriesDataset {
  slug: string;
  counts: number[]; // aligned with labels
}

export interface DownloadsSeriesAll {
  labels: string[]; // YYYY-MM-DD (UTC), length = days, ending yesterday
  datasets: SeriesDataset[];
  lastComputedUtc: string; // ISO of generation time
}

export interface HackInsights {
  versionCounts: { version: string; downloads: number }[];
  totalUniqueDevices: number;
  latestUniqueDevices: number;
  adoptionRate: number; // 0..1
  isNewToday: boolean;
}

function getUtcBounds(days: number) {
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endISO = startOfTodayUtc.toISOString(); // exclude today
  const startUtc = new Date(startOfTodayUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - days);
  const startISO = startUtc.toISOString();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ttl = Math.max(1, Math.ceil((+nextMidnight - +now) / 1000));
  const dayStamp = startOfTodayUtc.toISOString().slice(0, 10); // YYYY-MM-DD
  return { startISO, endISO, ttl, dayStamp, startOfTodayUtc };
}

function buildUtcDateLabels(days: number, endExclusiveUtc: Date): string[] {
  const labels: string[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(endExclusiveUtc);
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }
  return labels;
}

export const getDownloadsSeriesAll = async ({ days = 30, userId }: { days?: number, userId?: string }): Promise<DownloadsSeriesAll> => {
  const { startISO, endISO, ttl, dayStamp, startOfTodayUtc } = getUtcBounds(days);

  // Resolve user and accessible slugs OUTSIDE cache (cookies not allowed in cache)
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) throw new Error("Unauthorized");

  // Get hacks owned by user
  const { data: ownedHacks } = await supa
    .from("hacks")
    .select("slug,created_by,current_patch,original_author,permission_from,is_archive")
    .is("is_archive", false)
    .eq("created_by", userId ?? user.id);
  const ownedSlugs = (ownedHacks ?? []).map((h) => h.slug);

  // Get archive hacks that user can edit as archiver
  const { data: allArchiveHacks } = await supa
    .from("hacks")
    .select("slug,created_by,current_patch,original_author,permission_from,is_archive")
    .eq("is_archive", true);

  const accessibleArchiveSlugs: string[] = [];
  if (allArchiveHacks) {
    const { isAdmin, isArchiver } = await checkUserRoles(supa);
    for (const hack of allArchiveHacks) {
      // Skip if already owned
      if (canEditAsCreator(hack, user.id)) continue;

      // Check if user can edit as archiver (function already checks if it's an archive and includes admins)
      // Pass both isAdmin and isArchiver since checkUserRoles distinguishes them, but admins should be included
      if (await canEditAsArchiver(hack, user.id, supa, { roles: { isAdmin, isArchiver } })) {
        accessibleArchiveSlugs.push(hack.slug);
      }
    }
  }

  const slugs = [...ownedSlugs, ...accessibleArchiveSlugs];

  const runner = cache(
    async () => {
      if (slugs.length === 0) {
        return {
          labels: buildUtcDateLabels(days, startOfTodayUtc),
          datasets: [],
          lastComputedUtc: new Date().toISOString(),
        } satisfies DownloadsSeriesAll;
      }

      // Fetch patches for all owned hacks (service client only)
      const svc = await createServiceClient();
      const { error: patchError, data: patchRows } = await svc
        .from("patches")
        .select("id,parent_hack")
        .in("parent_hack", slugs);
      if (patchError) throw patchError;

      const patchIdToSlug = new Map<number, string>();
      const patchIds: number[] = [];
      (patchRows ?? []).forEach((p) => {
        if (typeof p.id === "number" && p.parent_hack) {
          patchIdToSlug.set(p.id, p.parent_hack);
          patchIds.push(p.id);
        }
      });

      const labels = buildUtcDateLabels(days, startOfTodayUtc);
      const dateIndex = new Map<string, number>();
      labels.forEach((d, i) => dateIndex.set(d, i));

      const countsBySlug: Record<string, number[]> = {};
      slugs.forEach((s) => (countsBySlug[s] = new Array(labels.length).fill(0)));

      if (patchIds.length > 0) {
        // Fetch patch downloads in batches to avoid 1000 row limit
        const BATCH_SIZE = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { error: dlError, data: dlRows } = await svc
            .from("patch_downloads")
            .select("created_at,patch")
            .in("patch", patchIds)
            .gte("created_at", startISO)
            .lt("created_at", endISO)
            .range(offset, offset + BATCH_SIZE - 1)
            .order("created_at", { ascending: true });

          if (dlError) throw dlError;

          if (!dlRows || dlRows.length === 0) {
            hasMore = false;
          } else {
            (dlRows ?? []).forEach((row: any) => {
              const pid = row.patch as number | null;
              if (!pid) return;
              const slug = patchIdToSlug.get(pid);
              if (!slug) return;
              const day = new Date(row.created_at).toISOString().slice(0, 10);
              const idx = dateIndex.get(day);
              if (idx == null) return;
              countsBySlug[slug][idx] += 1;
            });

            // If we got fewer rows than the batch size, we've reached the end
            if (dlRows.length < BATCH_SIZE) {
              hasMore = false;
            } else {
              offset += BATCH_SIZE;
            }
          }
        }
      }

      const datasets: SeriesDataset[] = slugs.map((slug) => ({ slug, counts: countsBySlug[slug] || new Array(labels.length).fill(0) }));

      return {
        labels,
        datasets,
        lastComputedUtc: new Date().toISOString(),
      } satisfies DownloadsSeriesAll;
    },
    [
      `downloads-series-all:${userId ?? user.id}:${dayStamp}`,
    ],
    { revalidate: ttl }
  );

  return runner();
};

export const getHackInsights = async ({ slug }: { slug: string }): Promise<HackInsights> => {
  const { endISO, ttl, dayStamp, startOfTodayUtc } = getUtcBounds(30);

  // Authorization OUTSIDE cache (cookies not allowed in cache)
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) throw new Error("Unauthorized");
  const { data: hack } = await supa
    .from("hacks")
    .select("slug,created_by,current_patch,created_at,original_author,permission_from,is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) throw new Error("Not found");

  // Check if user can access: owner, admin, or archiver for archive hacks
  const isOwner = canEditAsCreator(hack, user.id);
  if (!isOwner) {
    const { data: admin } = await supa.rpc("is_admin");
    if (admin) {
      // Admin can access any hack
    } else if (await canEditAsArchiver(hack, user.id, supa)) {
      // Archiver can access archive hacks (function already checks if it's an archive and includes admins)
    } else {
      throw new Error("Forbidden");
    }
  }

  const currentPatchId = (hack.current_patch as number | null) ?? null;
  const hackCreatedAt = hack.created_at ? new Date(hack.created_at) : null;

  const runner = cache(
    async () => {
      const svc = await createServiceClient();
      const { error: patchError, data: patches } = await svc
        .from("patches")
        .select("id,version,created_at")
        .eq("parent_hack", slug);
      if (patchError) throw patchError;
      const patchIds = (patches ?? []).map((p) => p.id).filter((v): v is number => typeof v === "number");

      // Determine latest patch id
      let latestPatchId: number | null = currentPatchId;
      if (latestPatchId == null && (patches ?? []).length > 0) {
        const latest = [...(patches ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        latestPatchId = latest?.id ?? null;
      }

      // New today message if hack or latest patch is created today (UTC)
      const latestPatch = (patches ?? []).find((p) => p.id === latestPatchId) || null;
      const isNewToday = Boolean(
        (hackCreatedAt && hackCreatedAt >= startOfTodayUtc) || (latestPatch && new Date(latestPatch.created_at) >= startOfTodayUtc)
      );

      if (patchIds.length === 0) {
        return {
          versionCounts: [],
          totalUniqueDevices: 0,
          latestUniqueDevices: 0,
          adoptionRate: 0,
          isNewToday,
        } satisfies HackInsights;
      }

      // Fetch patch downloads in batches to avoid 1000 row limit
      const BATCH_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      const byPatchCount = new Map<number, number>();
      const allDevices = new Set<string>();
      const latestDevices = new Set<string>();

      while (hasMore) {
        const { error: dlError, data: dlRows } = await svc
          .from("patch_downloads")
          .select("patch,device_id")
          .in("patch", patchIds)
          .lt("created_at", endISO)
          .range(offset, offset + BATCH_SIZE - 1)
          .order("created_at", { ascending: true });

        if (dlError) throw dlError;

        if (!dlRows || dlRows.length === 0) {
          hasMore = false;
        } else {
          (dlRows ?? []).forEach((r: any) => {
            const pid = r.patch as number | null;
            const dev = r.device_id as string | null;
            if (pid == null) return;
            byPatchCount.set(pid, (byPatchCount.get(pid) ?? 0) + 1);
            if (dev) allDevices.add(dev);
            if (latestPatchId != null && pid === latestPatchId && dev) latestDevices.add(dev);
          });

          // If we got fewer rows than the batch size, we've reached the end
          if (dlRows.length < BATCH_SIZE) {
            hasMore = false;
          } else {
            offset += BATCH_SIZE;
          }
        }
      }

      const versionCounts = (patches ?? [])
        .map((p) => ({ version: p.version, downloads: byPatchCount.get(p.id) ?? 0, patchId: p.id }))
        .sort((a, b) => a.patchId - b.patchId);

      const totalUniqueDevices = allDevices.size;
      const latestUniqueDevices = latestDevices.size;
      const adoptionRate = totalUniqueDevices > 0 ? latestUniqueDevices / totalUniqueDevices : 0;

      return {
        versionCounts,
        totalUniqueDevices,
        latestUniqueDevices,
        adoptionRate,
        isNewToday,
      } satisfies HackInsights;
    },
    [
      `hack-insights:${user.id}:${slug}:${dayStamp}`,
    ],
    { revalidate: ttl }
  );

  return runner();
};

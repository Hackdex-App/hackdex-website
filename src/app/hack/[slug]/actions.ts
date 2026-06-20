"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { buildPatchDownloadUrl } from "@/utils/patches/patch-download-url";
import { isInformationalArchiveHack, canEditAsCreator, canEditAsAdmin } from "@/utils/hack";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { headers } from "next/headers";
import { validateEmail } from "@/utils/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { unstable_cache as cache } from "next/cache";
import { sortOrderedTags, getCoverUrls } from "@/utils/format";
import { Database, Constants } from "@/types/db";
import { getPatcherSelectablePatches } from "@/utils/patches/patcher-selectable-patches";
import { CUSTOM_VERSION_NAME_MAX_LENGTH, resolveHackDisplayVersion } from "@/utils/patches/hack-display-version";
import type { SelectablePatch } from "@/types/patcher";

const PATCHES_DOWNLOAD_PERMISSION_VALUES = Constants.public.Enums[
  "Patches Download Permission"
] as readonly Database["public"]["Enums"]["Patches Download Permission"][];

export interface HackMetadata {
  hack: {
    slug: string;
    title: string;
    summary: string;
    description: string;
    base_rom: string;
    created_at: string;
    updated_at: string | null;
    current_patch: number | null;
    box_art: string | null;
    social_links: unknown;
    created_by: string;
    approved: boolean;
    original_author: string | null;
    permission_from: string | null;
    language: string | null;
    is_archive: boolean;
    completion_status: Database["public"]["Enums"]["Completion Status"] | null;
    verification_contact_info: string | null;
  };
  displayVersion: string;
  images: string[];
  tags: string[];
  profile: {
    username: string | null;
    avatar_url: string | null;
    verified: boolean;
    email: string | null;
  } | null;
  otherHacks: {
    slug: string;
    title: string;
    summary: string;
  }[];
  patch: {
    id: number;
    filename: string;
    version: string | null;
    created_at: string;
    changelog: string | null;
  } | null;
  patcherSelector: {
    selectablePatches: SelectablePatch[];
    defaultPatchId: number | null;
  };
}

export async function getHackMetadata(slug: string): Promise<HackMetadata | null> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();

      const { data: hack, error } = await supabase
        .from("hacks")
        .select("slug,title,summary,description,base_rom,created_at,updated_at,current_patch,custom_version_name,box_art,social_links,created_by,approved,original_author,permission_from,language,is_archive,completion_status,verification_contact_info")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !hack) return null;

      // Security: Don't return verification_contact_info if hack is approved
      if (hack.approved) {
        hack.verification_contact_info = null;
      }

      // Fetch covers
      let images: string[] = [];
      const { data: covers } = await supabase
        .from("hack_covers")
        .select("url, position")
        .eq("hack_slug", slug)
        .order("position", { ascending: true });
      if (covers && covers.length > 0) {
        images = getCoverUrls(covers.map(c => c.url));
      }

      // Fetch tags
      const { data: tagRows } = await supabase
        .from("hack_tags")
        .select("order,tags(name)")
        .eq("hack_slug", slug);

      const tags = sortOrderedTags(
        (tagRows || [])
          .map((r) => ({
            name: r.tags.name,
            order: r.order,
          }))
      ).map((t) => t.name);

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,verified")
        .eq("id", hack.created_by as string)
        .maybeSingle();

      // Meant to only be available to admins (gated in server-side page rendering)
      let userEmail: string | null = null;
      if (profile) {
        const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
        userEmail = userData?.user?.email || null;
      }

      // Get other approved hacks by the same author (non-archive hacks only)
      let otherHacks: {
        slug: string;
        title: string;
        summary: string;
      }[] = [];
      if (!hack.is_archive && !hack.original_author) {
        const { data: otherHacksData } = await supabase
          .from("hacks")
          .select("slug,title,summary")
          .eq("created_by", hack.created_by)
          .eq("approved", true)
          .eq("is_archive", false)
          .neq("slug", hack.slug)
          .order("downloads", { ascending: false })
          .limit(10);
        otherHacks = otherHacksData ?? [];
      }

      // Get patch info
      let patch: {
        id: number;
        filename: string;
        version: string | null;
        created_at: string;
        changelog: string | null;
      } | null = null;
      if (hack.current_patch != null) {
        const { data: patchData } = await supabase
          .from("patches")
          .select("id,bucket,filename,version,created_at,changelog")
          .eq("id", hack.current_patch)
          .maybeSingle();
        if (patchData) {
          patch = {
            id: patchData.id,
            filename: patchData.filename,
            version: patchData.version || null,
            created_at: patchData.created_at,
            changelog: patchData.changelog || null,
          };
        }
      }

      const { savedPatchIds, selectablePatches, defaultPatchId } = await getPatcherSelectablePatches(supabase, slug, hack.current_patch);
      const displayVersion = resolveHackDisplayVersion({
        isArchive: hack.is_archive,
        isCustomPatcherActive: savedPatchIds.length > 0,
        customVersionName: hack.custom_version_name,
        customDefaultPatchVersion: selectablePatches[0]?.version,
        currentPatchVersion: patch?.version,
      });

      return {
        hack,
        displayVersion,
        images,
        tags,
        profile: profile ? {
          username: profile.username,
          avatar_url: profile.avatar_url,
          verified: profile.verified,
          email: userEmail,
        } : null,
        otherHacks,
        patch,
        patcherSelector: {
          selectablePatches,
          defaultPatchId,
        }
      };
    },
    [`hack:${slug}:metadata`],
    {
      revalidate: 14400, // 4 hours
      tags: ["hack", `hack:${slug}:metadata`],
    }
  );

  return runner();
}

export async function getHackDownloads(slug: string): Promise<number | null> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();
      const { data: hack, error } = await supabase
        .from("hacks")
        .select("downloads")
        .eq("slug", slug)
        .maybeSingle();
      
      if (error || !hack) return null;
      return hack.downloads || 0;
    },
    [`hack:${slug}:downloads`],
    {
      revalidate: 600, // 10 minutes
      tags: ["hack", `hack:${slug}:downloads`],
    }
  );

  return runner();
}

export async function getSignedPatchUrl(
  slug: string,
  options?: {
    patchId?: number;
  }
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Get user for permission check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch hack to validate it exists
  const { data: hack, error: hackError } = await supabase
    .from("hacks")
    .select("slug, approved, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();

  if (hackError || !hack) {
    return { ok: false, error: "Hack not found" };
  }

  // Check if hack is approved or user has permission (owner or admin)
  const canEdit = !!user && user.id === (hack.created_by as string);
  let isAdmin = false;

  if (!hack.approved && !canEdit) {
    const { data: admin } = await supabase.rpc("is_admin");
    isAdmin = !!admin;
    if (!isAdmin) {
      return { ok: false, error: "Hack not found" };
    }
  }

  // Check if this is an Informational Archive hack (no patch available)
  if (isInformationalArchiveHack(hack)) {
    return { ok: false, error: "Archive hacks do not have patch files available" };
  }

  // Get selectable patches and validate selected patch id
  const { selectablePatches } = await getPatcherSelectablePatches(supabase, slug, hack.current_patch);
  const allowedPatchIds = new Set(selectablePatches.map((patch) => patch.id));
  const selectedPatchId = options?.patchId ?? hack.current_patch;

  if (selectedPatchId === null || !allowedPatchIds.has(selectedPatchId)) {
    return { ok: false, error: "Patch not available" };
  }

  // Fetch patch info
  const { data: patch, error: patchError } = await supabase
    .from("patches")
    .select("id, bucket, filename")
    .eq("id", selectedPatchId)
    .maybeSingle();

  if (patchError || !patch) {
    return { ok: false, error: "Patch not found" };
  }

  try {
    const workerUrl = buildPatchDownloadUrl(patch.filename);
    if (workerUrl) {
      return { ok: true, url: workerUrl };
    }
    const client = getMinioClient();
    const bucket = patch.bucket || PATCHES_BUCKET;
    const signedUrl = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
    return { ok: true, url: signedUrl };
  } catch (error) {
    console.error("Error signing patch URL:", error);
    return { ok: false, error: "Failed to generate download URL" };
  }
}

export async function updatePatchDownloadCount(patchId: number, deviceIdObscured: string[]): Promise<{ ok: true; didIncrease: boolean } | { ok: false; error: string }> {
  if (deviceIdObscured.length !== 5) {
    return { ok: false, error: "Invalid device ID" };
  }
  const deviceId = deviceIdObscured.join("-");
  const supabase = await createClient();
  const { error: updateError } = await supabase
    .from("patch_downloads")
    .insert({ patch: patchId, device_id: deviceId });
  if (updateError) {
    if ('code' in updateError && (updateError.code === '23505' || /duplicate|unique/i.test(updateError.message))) {
      return { ok: true, didIncrease: false };
    }
    return { ok: false, error: updateError.message };
  }
  return { ok: true, didIncrease: true };
}

export async function submitHackReport(data: {
  slug: string;
  reportType: "hateful" | "harassment" | "misleading" | "stolen";
  details: string | null;
  email: string | null;
  isImpersonating: boolean | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Validate hack exists
  const { data: hack, error: hackError } = await supabase
    .from("hacks")
    .select("slug, title")
    .eq("slug", data.slug)
    .maybeSingle();

  if (hackError || !hack) {
    return { error: "Hack not found" };
  }

  // Validate email if provided (for stolen reports)
  if (data.reportType === "stolen" && data.email) {
    const emailLower = data.email.trim().toLowerCase();
    const { error: emailError } = validateEmail(emailLower);
    if (emailError) {
      return { error: emailError };
    }
  }

  // Validate required fields
  if (data.reportType === "misleading" && !data.details?.trim()) {
    return { error: "Details are required for misleading reports" };
  }

  if (data.reportType === "stolen") {
    if (!data.email?.trim()) {
      return { error: "Email is required for stolen hack reports" };
    }
    if (!data.details?.trim()) {
      return { error: "Details are required for stolen hack reports" };
    }
  }

  // Build hack URL
  const hdrs = await headers();
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : "";
  const proto = siteBase ? "" : (hdrs.get("x-forwarded-proto") || "https");
  const host = siteBase ? "" : (hdrs.get("host") || "");
  const baseUrl = siteBase || (proto && host ? `${proto}://${host}` : "");
  const hackUrl = baseUrl ? `${baseUrl}/hack/${data.slug}` : `/hack/${data.slug}`;

  // Format report type for display
  const reportTypeLabels: Record<typeof data.reportType, string> = {
    hateful: "Hateful Content",
    harassment: "Harassment",
    misleading: "Misleading",
    stolen: "My Hack Was Stolen",
  };

  // Build Discord embed fields
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: "Report Type",
      value: reportTypeLabels[data.reportType],
      inline: false,
    },
    {
      name: "Hack",
      value: `[${hack.title}](${hackUrl})`,
      inline: false,
    },
  ];

  if (data.details) {
    fields.push({
      name: "Details",
      value: data.details.length > 1000 ? data.details.substring(0, 1000) + "..." : data.details,
      inline: false,
    });
  }

  if (data.reportType === "stolen") {
    if (data.email) {
      fields.push({
        name: "Contact Email",
        value: data.email.trim().toLowerCase(),
        inline: false,
      });
    }
    if (data.isImpersonating !== null) {
      fields.push({
        name: "Is Uploader Impersonating?",
        value: data.isImpersonating ? "Yes" : "No",
        inline: true,
      });
    }
  }

  // Send Discord webhook
  if (process.env.DISCORD_WEBHOOK_ADMIN_REPORTS_URL) {
    try {
      await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_REPORTS_URL, [
        {
          title: "Hack Report",
          description: `A new report has been submitted for [${hack.title}](${hackUrl})`,
          color: 0xff6b6b, // Red color for reports
          fields,
          footer: {
            text: `Hack Slug: ${data.slug}`,
          },
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error sending Discord webhook:", error);
      return { error: "Failed to submit report. Please try again later." };
    }
  }

  return { error: null };
}

export async function getPatchDownloadUrl(patchId: number): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Fetch patch info with parent_hack
  const { data: patch, error: patchError } = await supabase
    .from("patches")
    .select("id, bucket, filename, published, archived, parent_hack")
    .eq("id", patchId)
    .maybeSingle();

  if (patchError || !patch) {
    return { ok: false, error: "Patch not found" };
  }

  if (!patch.parent_hack) {
    return { ok: false, error: "Patch not found" };
  }

  const { data: hack, error: hackError } = await supabase
    .from("hacks")
    .select("slug, created_by, original_author, is_archive, current_patch, patches_download_permission")
    .eq("slug", patch.parent_hack)
    .maybeSingle();

  if (hackError || !hack) {
    return { ok: false, error: "Hack not found" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isEditor =
    !!user &&
    (canEditAsCreator(hack, user.id) || (await canEditAsAdmin(hack, user.id, supabase)));

  // Only allow downloading published, non-archived patches (unless user can edit)
  if (!patch.published || patch.archived) {
    if (!isEditor) {
      return { ok: false, error: "Unauthorized" };
    }
  } else if (!isEditor) {
    const permission = hack.patches_download_permission;
    if (permission === "None") {
      return { ok: false, error: "Unauthorized" };
    }
    if (permission === "Current") {
      const { selectablePatches } = await getPatcherSelectablePatches(supabase, hack.slug, hack.current_patch);
      const allowedPatchIds = new Set(selectablePatches.map((patch) => patch.id));
      if (hack.current_patch == null && !allowedPatchIds.has(patch.id)) {
        return { ok: false, error: "Unauthorized" };
      }
    }
    // "All": published + non-archived already satisfied
  }

  try {
    const workerUrl = buildPatchDownloadUrl(patch.filename);
    if (workerUrl) {
      return { ok: true, url: workerUrl };
    }
    const client = getMinioClient();
    const bucket = patch.bucket || PATCHES_BUCKET;
    const signedUrl = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
    return { ok: true, url: signedUrl };
  } catch (error) {
    console.error("Error signing patch URL:", error);
    return { ok: false, error: "Failed to generate download URL" };
  }
}

export async function updatePatchesDownloadPermission(
  slug: string,
  permission: Database["public"]["Enums"]["Patches Download Permission"],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!PATCHES_DOWNLOAD_PERMISSION_VALUES.includes(permission)) {
    return { ok: false, error: "Invalid permission" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("hacks")
    .update({ patches_download_permission: permission })
    .eq("slug", slug);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/hack/${slug}/versions`);
  return { ok: true };
}

export async function archivePatchVersion(slug: string, patchId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Cannot archive current_patch
  if (hack.current_patch === patchId) {
    return { ok: false, error: "Cannot archive the current patch version" };
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  const { data: customRows, error: customErr } = await supabase
    .from("hack_patcher_patches")
    .select("patch_id")
    .eq("hack_slug", slug);
  if (customErr) return { ok: false, error: customErr.message };

  const isInCustomList = (customRows || []).some((row) => row.patch_id === patchId);
  if (isInCustomList && (customRows?.length || 0) <= 2) {
    return {
      ok: false,
      error: "This is one of the last 2 versions in the Custom patcher list. Switch to Latest published patch or add another Custom version before archiving it.",
    };
  }

  // Archive the patch
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  if (isInCustomList) {
    const { error: deleteErr } = await serviceClient
      .from("hack_patcher_patches")
      .delete()
      .eq("hack_slug", slug)
      .eq("patch_id", patchId);
    if (deleteErr) return { ok: false, error: deleteErr.message };
  }

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}`);
  revalidatePath(`/hack/${slug}/versions`);
  return { ok: true };
}

export async function restorePatchVersion(slug: string, patchId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Restore the patch (un-archive)
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ archived: false, archived_at: null })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/hack/${slug}/versions`);
  return { ok: true };
}

export async function rollbackToVersion(slug: string, patchId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack and get its created_at
  const { data: rollbackPatch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack, created_at")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !rollbackPatch || rollbackPatch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Update current_patch
  const { error: updateHackErr } = await supabase
    .from("hacks")
    .update({ current_patch: patchId })
    .eq("slug", slug);
  if (updateHackErr) return { ok: false, error: updateHackErr.message };

  // Unpublish all patches created after the rollback patch
  const serviceClient = await createServiceClient();
  const { error: unpubErr } = await serviceClient
    .from("patches")
    .update({ published: false })
    .eq("parent_hack", slug)
    .gt("created_at", rollbackPatch.created_at);

  if (unpubErr) return { ok: false, error: unpubErr.message };

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}/versions`);
  revalidatePath(`/hack/${slug}`);
  return { ok: true };
}

export async function updatePatchChangelog(slug: string, patchId: number, changelog: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Update changelog
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ changelog: changelog.trim() || null })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}/versions`);
  revalidatePath(`/hack/${slug}/changelog`);
  return { ok: true };
}

export async function updatePatchVersion(slug: string, patchId: number, version: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack, version")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Trim and validate version
  const trimmedVersion = version.trim();
  if (!trimmedVersion) {
    return { ok: false, error: "Version cannot be empty" };
  }

  // If version hasn't changed, return success
  if (patch.version === trimmedVersion) {
    return { ok: true };
  }

  // Check if version already exists for this hack (excluding current patch)
  const { data: existing, error: vErr } = await supabase
    .from("patches")
    .select("id")
    .eq("parent_hack", slug)
    .eq("version", trimmedVersion)
    .neq("id", patchId)
    .maybeSingle();
  if (vErr) return { ok: false, error: vErr.message };
  if (existing) return { ok: false, error: "That version already exists for this hack." };

  // Update version
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ version: trimmedVersion, updated_at: new Date().toISOString() })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}/versions`);
  revalidatePath(`/hack/${slug}`);
  return { ok: true };
}

export async function publishPatchVersion(slug: string, patchId: number): Promise<{ ok: true; willBecomeCurrent?: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack and get its created_at
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack, created_at")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Check if hack has any patches in hack_patcher_patches
  const { data: patcherPatches, error: ppErr } = await supabase
    .from("hack_patcher_patches")
    .select("patch_id")
    .eq("hack_slug", slug);
  if (ppErr) return { ok: false, error: ppErr.message };

  // Check if this patch is newer than current_patch, but only if there are no patcher patches
  let willBecomeCurrent = false;
  const serviceClient = await createServiceClient();
  if (patcherPatches.length === 0) {
    if (hack.current_patch) {
      const { data: currentPatch } = await serviceClient
        .from("patches")
        .select("created_at")
        .eq("id", hack.current_patch)
        .maybeSingle();
      if (currentPatch && new Date(patch.created_at) > new Date(currentPatch.created_at)) {
        willBecomeCurrent = true;
      }
    } else {
      willBecomeCurrent = true;
    }
  }

  // Publish the patch
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ published: true, published_at: new Date().toISOString() })
    .eq("id", patchId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // If newer than current_patch and no patcher patches, update current_patch
  if (willBecomeCurrent) {
    const { error: updateHackErr } = await supabase
      .from("hacks")
      .update({ current_patch: patchId })
      .eq("slug", slug);
    if (updateHackErr) return { ok: false, error: updateHackErr.message };
  }

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}/versions`);
  revalidatePath(`/hack/${slug}`);
  return { ok: true, willBecomeCurrent };
}

export async function reuploadPatchVersion(
  slug: string,
  patchId: number,
  objectKey: string
): Promise<{ ok: true; presignedUrl: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack, filename")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Generate presigned URL for upload
  const client = getMinioClient();
  const url = await client.presignedPutObject(PATCHES_BUCKET, objectKey, 60 * 10);

  // Update patch filename after upload (caller should handle the actual upload and update)
  return { ok: true, presignedUrl: url };
}

export async function confirmReuploadPatchVersion(
  slug: string,
  patchId: number,
  objectKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Verify patch belongs to this hack
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .select("id, parent_hack")
    .eq("id", patchId)
    .maybeSingle();
  if (pErr || !patch || patch.parent_hack !== slug) {
    return { ok: false, error: "Patch not found" };
  }

  // Update patch filename
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ filename: objectKey, updated_at: new Date().toISOString() })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}/versions`);
  return { ok: true };
}

export async function updatePatcherSelectablePatches(
  slug: string,
  patchIds: number[],
  customVersionName?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  // Check permissions: creator first (optimization), then admin
  if (!canEditAsCreator(hack, user.id)) {
    const editableAsAdmin = await canEditAsAdmin(hack, user.id, supabase);
    if (!editableAsAdmin) {
      return { ok: false, error: "Forbidden" };
    }
  }

  // Dedupe patch ids
  const uniquePatchIds = [...new Set(patchIds)];
  const trimmedCustomVersionName = customVersionName?.trim() || null;

  if (uniquePatchIds.length > 0) {
    if (!trimmedCustomVersionName) {
      return { ok: false, error: "Custom version name is required." };
    }
    if (trimmedCustomVersionName.length > CUSTOM_VERSION_NAME_MAX_LENGTH) {
      return { ok: false, error: "Custom version name must be 12 characters or fewer." };
    }
  }

  if (uniquePatchIds.length > 0) {
    // Verify patches belong to this hack
    const { data: patches, error: pErr } = await supabase
      .from("patches")
      .select("id, parent_hack, published, archived")
      .in("id", uniquePatchIds)
      .eq("parent_hack", slug);
    if (pErr || patches.length !== uniquePatchIds.length) return { ok: false, error: "One or more patches do not belong to this hack" };

    // Verify patches are not archived
    const archivedPatches = patches.filter((patch) => patch.archived);
    if (archivedPatches.length > 0) return { ok: false, error: "One or more patches are archived" };

    const unpublishedPatchIds = patches.filter((patch) => !patch.published).map((patch) => patch.id);
    if (unpublishedPatchIds.length > 0) {
      const serviceClient = await createServiceClient();
      const { error: publishErr } = await serviceClient
        .from("patches")
        .update({ published: true, published_at: new Date().toISOString() })
        .in("id", unpublishedPatchIds);
      if (publishErr) return { ok: false, error: publishErr.message };
    }
  }

  // Replace patcher patches
  const { error: replaceErr } = await supabase.rpc("replace_hack_patcher_patches", {
    p_hack_slug: slug,
    p_patch_ids: uniquePatchIds,
  });
  if (replaceErr) return { ok: false, error: replaceErr.message };

  const { error: nameErr } = await supabase
    .from("hacks")
    .update({ custom_version_name: uniquePatchIds.length > 0 ? trimmedCustomVersionName : null })
    .eq("slug", slug);
  if (nameErr) return { ok: false, error: nameErr.message };

  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}`);
  revalidatePath(`/hack/${slug}/versions`);

  return { ok: true };
}

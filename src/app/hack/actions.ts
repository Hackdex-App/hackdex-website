"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import type { TablesInsert, TablesUpdate, Database } from "@/types/db";
import { getMinioClient, PATCHES_BUCKET, COVERS_BUCKET } from "@/utils/minio/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { APIEmbed } from "discord-api-types/v10";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { checkEditPermission, checkPatchEditPermission } from "@/utils/hack";
import { getCachedTagsWithUsage, resolveTagIdsInOrder } from "@/data/tags";
import { sendTransactionalEmail } from "@/utils/email";
import { renderEmail } from "@/emails/render";
import { approveDiscordReviewThread } from "@/utils/discord-rest";
import {
  ensureHackReviewThread,
  getHackReviewThread,
  postHackReviewMessage,
} from "@/utils/hack-review";
import { revalidateDiscoverCatalog } from "@/app/discover/revalidate";
import { aiColumns, parseAiLevels, type AiLevels } from "@/utils/aiDisclosure";
import { isCoverKeyFor, newPatchKey } from "@/utils/storageKeys";
import { MAX_COVERS, SUMMARY_MAX, TITLE_MAX } from "@/data/hackLimits";
import { baseRoms } from "@/data/baseRoms";
import type { PatchFormat } from "@/utils/patching";

export async function updateHack(args: {
  slug: string;
  title?: string;
  summary?: string;
  description?: string;
  base_rom?: string;
  language?: string;
  completion_status?: Database["public"]["Enums"]["Completion Status"] | null;
  version?: string;
  box_art?: string | null;
  social_links?: {
    discord?: string;
    twitter?: string;
    pokecommunity?: string;
    github?: string;
  } | null;
  tags?: string[];
  /** Only for hacks uploaded on someone else's behalf; neither may be cleared. */
  original_author?: string;
  permission_from?: string;
  verification_contact_info?: string | null;
  /** Replaces the whole AI disclosure and marks it confirmed now. */
  ai?: { levels: AiLevels; note: string | null };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from, is_archive, approved, base_rom")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

  const permission = await checkEditPermission(hack, user.id, supabase);
  if (!permission.canEdit) {
    return { ok: false, error: "Forbidden" } as const;
  }

  const updatePayload: TablesUpdate<"hacks"> = {};
  if (args.title !== undefined) {
    if (!args.title.trim() || args.title.length > TITLE_MAX) return { ok: false, error: `Keep the title between 1 and ${TITLE_MAX} characters` } as const;
    updatePayload.title = args.title;
  }
  if (args.summary !== undefined) {
    if (args.summary.length > SUMMARY_MAX) return { ok: false, error: `Keep the summary to ${SUMMARY_MAX} characters` } as const;
    updatePayload.summary = args.summary;
  }
  if (args.description !== undefined) updatePayload.description = args.description;
  if (args.base_rom !== undefined) {
    if (!baseRoms.some((r) => r.id === args.base_rom)) return { ok: false, error: "Choose a base ROM from the list" } as const;
    // Patches are built against one ROM; switching it after an upload would make players patch the wrong game.
    if (args.base_rom !== hack.base_rom) {
      const { count } = await supabase.from("patches").select("id", { count: "exact", head: true }).eq("parent_hack", args.slug);
      if (count) return { ok: false, error: "The base ROM is locked once a patch is uploaded" } as const;
    }
    updatePayload.base_rom = args.base_rom;
  }
  if (args.language !== undefined) updatePayload.language = args.language;
  if (args.completion_status !== undefined) {
    if (args.completion_status === null) {
      return { ok: false, error: "Completion status is required" } as const;
    }
    updatePayload.completion_status = args.completion_status;
  }
  if (args.version !== undefined) updatePayload.version = args.version;
  if (args.box_art !== undefined) updatePayload.box_art = args.box_art;
  if (args.social_links !== undefined) updatePayload.social_links = args.social_links;
  if (args.original_author !== undefined || args.permission_from !== undefined) {
    if (!hack.original_author) {
      return { ok: false, error: "This hack was not uploaded on someone else's behalf" } as const;
    }
    if (args.original_author?.trim() === "" || args.permission_from?.trim() === "") {
      return { ok: false, error: "Name the creator and where they gave permission" } as const;
    }
    if (args.original_author !== undefined) updatePayload.original_author = args.original_author.trim();
    if (args.permission_from !== undefined) updatePayload.permission_from = args.permission_from.trim();
  }
  if (args.verification_contact_info !== undefined) {
    updatePayload.verification_contact_info = args.verification_contact_info?.trim() || null;
  }
  if (args.ai !== undefined) {
    const levels = parseAiLevels(args.ai.levels);
    if (!levels) return { ok: false, error: "Pick a level for every area of the AI label" } as const;
    if ((args.ai.note?.length ?? 0) > 1000) return { ok: false, error: "Keep the AI explanation under 1,000 characters" } as const;
    Object.assign(updatePayload, aiColumns(levels, args.ai.note));
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: uErr } = await supabase
      .from("hacks")
      .update(updatePayload)
      .eq("slug", args.slug);
    if (uErr) return { ok: false, error: uErr.message } as const;
  }

  if (args.tags) {
    const catalog = await getCachedTagsWithUsage();
    const resolved = resolveTagIdsInOrder(args.tags, catalog);
    const desiredIds = resolved.map((t) => t.id);

    const { data: currentLinks, error: curErr } = await supabase
      .from("hack_tags")
      .select("tag_id")
      .eq("hack_slug", args.slug);
    if (curErr) return { ok: false, error: curErr.message } as const;

    const currentIds = new Set((currentLinks || []).map((r) => r.tag_id));
    const desiredSet = new Set(desiredIds);

    // Remove links for tags that are no longer present
    const toRemove = Array.from(currentIds).filter((id) => !desiredSet.has(id));
    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from("hack_tags")
        .delete()
        .eq("hack_slug", args.slug)
        .in("tag_id", toRemove);
      if (delErr) return { ok: false, error: delErr.message } as const;
    }

    // Upsert links for all desired tags with the correct order
    if (desiredIds.length > 0) {
      const rows: TablesInsert<"hack_tags">[] = desiredIds.map((id, index) => ({
        hack_slug: args.slug,
        tag_id: id,
        order: index + 1,
      }));

      const { error: upErr } = await supabase
        .from("hack_tags")
        .upsert(rows, { onConflict: "hack_slug,tag_id" });
      if (upErr) return { ok: false, error: upErr.message } as const;
    }

    // Update tags_updated_at if anything was added or removed (but not reordered)
    const tagsUpdated = toRemove.length > 0 || desiredIds.some((id) => !currentIds.has(id));
    if (tagsUpdated) {
      const { error: upErr } = await supabase
        .from("hacks")
        .update({ tags_updated_at: new Date().toISOString() })
        .eq("slug", args.slug);
      if (upErr) return { ok: false, error: upErr.message } as const;
    }
  }

  revalidateTag(`hack:${args.slug}:metadata`);
  revalidatePath(`/hack/${args.slug}`);
  // Only listed hacks are in the catalog; drafts autosave constantly and would rebuild it each time.
  if (hack.approved) revalidateDiscoverCatalog();
  // The upload step confirms against this stamp.
  return { ok: true, aiDisclosedAt: updatePayload.ai_disclosed_at ?? null } as const;
}

export async function saveHackCovers(args: { slug: string; coverUrls: string[] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from, is_archive, approved")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

  const permission = await checkEditPermission(hack, user.id, supabase);
  if (!permission.canEdit) {
    return { ok: false, error: "Forbidden" } as const;
  }

  // Fetch current covers to compute removals and preserve alt text
  const { data: currentRows, error: cErr } = await supabase
    .from("hack_covers")
    .select("id, url, alt")
    .eq("hack_slug", args.slug)
    .order("position", { ascending: true });
  if (cErr) return { ok: false, error: cErr.message } as const;

  const existingAltMap = new Map((currentRows || []).map((r) => [r.url, r.alt || null]));
  const existingIdMap = new Map((currentRows || []).map((r) => [r.url, r.id]));
  const currentUrls = new Set((currentRows || []).map((r) => r.url));
  const desiredSet = new Set(args.coverUrls);
  if (args.coverUrls.length > MAX_COVERS) return { ok: false, error: `Up to ${MAX_COVERS} screenshots` } as const;
  // New keys must be this hack's own uploads; otherwise removing one later would delete another hack's file.
  if (args.coverUrls.some((u) => !currentUrls.has(u) && !isCoverKeyFor(args.slug, u))) {
    return { ok: false, error: "Invalid screenshot" } as const;
  }

  const toRemove = Array.from(currentUrls).filter((u) => !desiredSet.has(u));

  // Remove rows that are no longer desired
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("hack_covers")
      .delete()
      .eq("hack_slug", args.slug)
      .in("url", toRemove);
    if (delErr) return { ok: false, error: delErr.message } as const;
    // Best-effort removal of orphaned files from S3, only inside this hack's folder
    const client = getMinioClient();
    for (const key of toRemove.filter((k) => isCoverKeyFor(args.slug, k))) {
      try {
        await client.removeObject(COVERS_BUCKET, key);
      } catch (e) {
        // Ignore errors - best effort cleanup
      }
    }
  }

  // Upsert desired rows (insert new and update existing positions/alts)
  if (args.coverUrls.length > 0) {
    // Existing rows keep their pk, which the upsert needs.
    const rows = args.coverUrls.map((url, idx): TablesInsert<"hack_covers"> => ({
      id: existingIdMap.get(url),
      hack_slug: args.slug,
      url,
      position: idx + 1,
      alt: existingAltMap.get(url) || null,
    }));

    const updatedRows = rows.filter((r) => r.id !== undefined);
    const newRows = rows.filter((r) => r.id === undefined);

    if (updatedRows.length > 0) {
      const { error: upErr } = await supabase.from("hack_covers").upsert(updatedRows, { onConflict: "id" });
      if (upErr) return { ok: false, error: upErr.message } as const;
    }

    if (newRows.length > 0) {
      const { error: insErr } = await supabase.from("hack_covers").insert(newRows, { defaultToNull: false });
      if (insErr) return { ok: false, error: insErr.message } as const;
    }

  }

  revalidateTag(`hack:${args.slug}:metadata`);
  revalidatePath(`/hack/${args.slug}`);
  if (hack.approved) revalidateDiscoverCatalog();
  return { ok: true } as const;
}


/** Signs an upload for a new version. The key is made here so it can only land in this hack's files. */
export async function presignNewPatchVersion(args: { slug: string; version: string; format: PatchFormat }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Ensure hack exists and user has permission
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from, is_archive")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

  const permission = await checkPatchEditPermission(hack, user.id, supabase);
  if (permission.error) {
    return { ok: false, error: permission.error } as const;
  }
  if (!permission.canEdit) {
    return { ok: false, error: "Forbidden" } as const;
  }

  // Enforce unique version per hack
  const { data: existing } = await supabase
    .from("patches")
    .select("id")
    .eq("parent_hack", args.slug)
    .eq("version", args.version)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, error: "That version already exists for this hack." } as const;

  const objectKey = newPatchKey(args.slug, args.version, args.format === "xdelta" ? "xdelta" : "bps");

  const client = getMinioClient();
  // 10 minutes to upload
  const url = await client.presignedPutObject(PATCHES_BUCKET, objectKey, 60 * 10);

  return { ok: true, presignedUrl: url, objectKey } as const;
}

export async function presignCoverUpload(args: { slug: string; objectKey: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Ensure hack exists and user has permission
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from, is_archive")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

  const permission = await checkEditPermission(hack, user.id, supabase);
  if (!permission.canEdit) {
    return { ok: false, error: "Forbidden" } as const;
  }
  if (!isCoverKeyFor(args.slug, args.objectKey)) return { ok: false, error: "Invalid screenshot path" } as const;

  const client = getMinioClient();
  // 10 minutes to upload
  const url = await client.presignedPutObject(COVERS_BUCKET, args.objectKey, 60 * 10);

  return { ok: true, presignedUrl: url } as const;
}


export async function approveHack(slug: string, verified?: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Forbidden" } as const;

  const serviceClient = await createServiceClient();

  // Check if hack exists
  const { data: hack, error: hErr } = await serviceClient
    .from("hacks")
    .select("slug, approved, title, created_by, submitted_at, current_patch, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  // Only the creator can submit; a draft isn't in the queue yet.
  if (hack.submitted_at === null) return { ok: false, error: "This hack hasn't been submitted for review yet." } as const;
  if (!hack.approved && !hack.is_archive && hack.current_patch === null) return { ok: false, error: "This hack has no playable patch yet." } as const;

  if (verified === true) {
    const { error: updateErr } = await serviceClient
      .from("profiles")
      .update({ verified: true })
      .eq("id", hack.created_by);
    if (updateErr) {
      // No need to return an error here
      console.error(updateErr);
    }
  }

  // If already approved, return success
  if (hack.approved) {
    revalidateTag(`hack:${slug}:metadata`);
    revalidatePath(`/hack/${slug}`);
    revalidateDiscoverCatalog();
    return { ok: true } as const;
  }

  // Approve the hack
  const { error: updateErr } = await supabase
    .from("hacks")
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq("slug", slug);

  if (updateErr) return { ok: false, error: updateErr.message } as const;
  // Before the notifications, so a failed one can't leave the page cached as unapproved.
  revalidateDiscoverCatalog();
  revalidateTag(`hack:${slug}:metadata`);
  revalidateTag(`hack:${slug}:downloads`);
  revalidatePath(`/hack/${slug}`);

  try {
    const { data: creatorData, error: creatorError } = await serviceClient.auth.admin.getUserById(hack.created_by);
    const creatorEmail = creatorData?.user?.email;
    if (creatorError || !creatorEmail) {
      console.error("[HackApprove] Failed to get creator email:", creatorError || "No email found");
    } else {
      const html = await renderEmail("hack-approved", {
        title: hack.title,
        slug,
      });
      await sendTransactionalEmail({
        to: creatorEmail,
        subject: `"${hack.title}" has been approved`,
        html,
      });
    }
  } catch (error) {
    console.error("[HackApprove] Failed to send email to creator:", error);
  }

  try {
    const reviewThread = await getHackReviewThread(slug);
    if (reviewThread) {
      await postHackReviewMessage(reviewThread, {
        content: `✅ **${hack.title}** has been approved and is now live on Hackdex.`,
      });
      await approveDiscordReviewThread(reviewThread.discord_thread_id);
    }
  } catch (error) {
    console.error(`[HackReview] Failed to update the approved review thread for ${slug}:`, error);
  }

  if (process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL) {
    try {
      const { data: profile } = await serviceClient.from('profiles').select('*').eq('id', hack.created_by).single();
      const displayName = profile?.username ? `@${profile.username}` : user.id;
      const embed: APIEmbed = {
        title: `:tada: ${hack.title} :tada:`,
        description: `A new hack by **${displayName}** is now live!`,
        color: 0x40f56a,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${slug}`,
        footer: {
          text: `This message brought to you by Hackdex`
        }
      }
      await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL, [
        embed,
      ]);
    } catch (error) {
      console.error(`[HackApprove] Failed to announce ${slug} on Discord:`, error);
    }
  }

  redirect(`/hack/${slug}`);
}

export async function createHackReviewThread(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Forbidden" } as const;

  const serviceClient = await createServiceClient();
  const { data: hack, error: hackError } = await serviceClient
    .from("hacks")
    .select("slug, title, created_by, assigned_admin, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (hackError) return { ok: false, error: hackError.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  if (hack.is_archive) {
    return { ok: false, error: "Archive hacks cannot have review threads." } as const;
  }

  try {
    const existingThread = await getHackReviewThread(slug);
    if (existingThread) {
      revalidatePath(`/hack/${slug}`);
      return { ok: true, alreadyExists: true } as const;
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("username")
      .eq("id", hack.created_by)
      .maybeSingle();
    const { data: assignedProfile } = hack.assigned_admin
      ? await serviceClient
        .from("profiles")
        .select("username")
        .eq("id", hack.assigned_admin)
        .maybeSingle()
      : { data: null };
    const reviewThread = await ensureHackReviewThread({
      slug: hack.slug,
      title: hack.title,
      author: profile?.username ? `@${profile.username}` : hack.created_by,
      isClaimed: hack.assigned_admin !== null,
    });
    if (!reviewThread) {
      return {
        ok: false,
        error: "Failed to create the Discord review thread.",
      } as const;
    }
    if (hack.assigned_admin) {
      await postHackReviewMessage(reviewThread, {
        content: `${assignedProfile?.username || "An admin"} has claimed the hack for review.`,
      });
    }

    revalidatePath(`/hack/${slug}`);
    return { ok: true, alreadyExists: false } as const;
  } catch (error) {
    console.error(`[HackReview] Failed to create a review thread for ${slug}:`, error);
    return {
      ok: false,
      error: "Failed to create the Discord review thread.",
    } as const;
  }
}


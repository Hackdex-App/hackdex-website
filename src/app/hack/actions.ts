"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import type { TablesInsert, Database } from "@/types/db";
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
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

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

  const updatePayload: TablesInsert<"hacks"> | any = {};
  if (args.title !== undefined) updatePayload.title = args.title;
  if (args.summary !== undefined) updatePayload.summary = args.summary;
  if (args.description !== undefined) updatePayload.description = args.description;
  if (args.base_rom !== undefined) updatePayload.base_rom = args.base_rom;
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

    const currentIds = new Set((currentLinks || []).map((r: any) => r.tag_id as number));
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
  revalidateDiscoverCatalog();
  return { ok: true } as const;
}

export async function saveHackCovers(args: { slug: string; coverUrls: string[] }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

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

  // Fetch current covers to compute removals and preserve alt text
  const { data: currentRows, error: cErr } = await supabase
    .from("hack_covers")
    .select("id, url, alt")
    .eq("hack_slug", args.slug)
    .order("position", { ascending: true });
  if (cErr) return { ok: false, error: cErr.message } as const;

  const existingAltMap = new Map((currentRows || []).map((r: any) => [r.url as string, (r.alt as string | null) || null]));
  const existingIdMap = new Map((currentRows || []).map((r: any) => [r.url as string, r.id as number]));
  const currentUrls = new Set((currentRows || []).map((r: any) => r.url as string));
  const desiredSet = new Set(args.coverUrls);

  const toRemove = Array.from(currentUrls).filter((u) => !desiredSet.has(u));

  // Remove rows that are no longer desired
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("hack_covers")
      .delete()
      .eq("hack_slug", args.slug)
      .in("url", toRemove);
    if (delErr) return { ok: false, error: delErr.message } as const;
    // Best-effort removal of orphaned files from S3
    const client = getMinioClient();
    for (const key of toRemove) {
      try {
        await client.removeObject(COVERS_BUCKET, key);
      } catch (e) {
        // Ignore errors - best effort cleanup
      }
    }
  }

  // Upsert desired rows (insert new and update existing positions/alts)
  if (args.coverUrls.length > 0) {
    const rows = args.coverUrls.map((url, idx) => {
      const base: any = { hack_slug: args.slug, url, position: idx + 1, alt: existingAltMap.get(url) || null };
      const id = existingIdMap.get(url);
      base.id = id || undefined; // include pk for existing rows per Supabase upsert requirement
      return base;
    });

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
  revalidateDiscoverCatalog();
  return { ok: true } as const;
}


export async function presignNewPatchVersion(args: { slug: string; version: string; objectKey?: string }) {
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

  const safeVersion = args.version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const objectKey = args.objectKey || `${args.slug}-${safeVersion}.bps`;

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
    .select("slug, approved, title, created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

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
  }

  revalidateTag(`hack:${slug}:metadata`);
  revalidateTag(`hack:${slug}:downloads`);
  revalidatePath(`/hack/${slug}`);
  revalidateDiscoverCatalog();
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


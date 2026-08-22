"use server";

import { createClient } from "@/utils/supabase/server";
import type { TablesInsert, Database } from "@/types/db";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { APIEmbed } from "discord-api-types/v10";
import { slugify } from "@/utils/format";
import { checkEditPermission, checkPatchEditPermission } from "@/utils/hack";
import { getCachedTagsWithUsage, resolveTagIdsInOrder } from "@/data/tags";
import type { PatchFormat } from "@/utils/patching";
import {
  ensureHackReviewThread,
  getHackReviewThread,
  postHackReviewMessage,
} from "@/utils/hack-review";

type HackInsert = TablesInsert<"hacks">;

function patchFormatFromObjectKey(objectKey: string): PatchFormat {
  return objectKey.toLowerCase().endsWith(".xdelta") ? "xdelta" : "bps";
}

async function ensureUniqueSlug(base: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  let candidate = base;
  let suffix = 2;
  // Loop until slug is unique
  while (true) {
    const { data, error } = await supabase
      .from("hacks")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function prepareSubmission(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  const title = (formData.get("title") as string)?.trim();
  const summary = (formData.get("summary") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const base_rom = (formData.get("base_rom") as string)?.trim();
  const language = (formData.get("language") as string)?.trim();
  const completion_status = (formData.get("completion_status") as string)?.trim() || null;
  const version = (formData.get("version") as string)?.trim();
  const box_art = (formData.get("box_art") as string)?.trim() || null;
  const discord = (formData.get("discord") as string)?.trim();
  const twitter = (formData.get("twitter") as string)?.trim();
  const pokecommunity = (formData.get("pokecommunity") as string)?.trim();
  const github = (formData.get("github") as string)?.trim();
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const original_author = (formData.get("original_author") as string)?.trim() || null;
  const permission_from = (formData.get("permission_from") as string)?.trim() || null;
  const verification_contact_info = (formData.get("verification_contact_info") as string)?.trim() || null;
  const is_archive = formData.get("is_archive") === "true";

  // For archives, version is not required; for regular hacks, it is
  if (!title || !summary || !description || !base_rom || !language || !completion_status || (!is_archive && !version)) {
    return { ok: false, error: "Missing required fields" } as const;
  }

  // For archives, original_author is required
  if (is_archive && !original_author) {
    return { ok: false, error: "Original author is required for Archive hacks" } as const;
  }

  const baseSlug = slugify(title);
  const slug = await ensureUniqueSlug(baseSlug, supabase);

  const social_links: HackInsert["social_links"] =
    discord || twitter || pokecommunity || github
      ? {
          discord: discord || undefined,
          twitter: twitter || undefined,
          pokecommunity: pokecommunity || undefined,
          github: github || undefined,
        }
      : null;

  const insertPayload: HackInsert = {
    slug,
    title,
    summary,
    description,
    base_rom,
    language,
    completion_status: completion_status as Database["public"]["Enums"]["Completion Status"],
    version: version || "Archive",
    created_by: user.id,
    downloads: 0,
    box_art,
    social_links,
    approved: is_archive, // Auto-approve archives
    is_archive,
    patch_url: "",
    original_author: original_author || null,
    permission_from: permission_from || null,
    verification_contact_info: verification_contact_info || null,
    current_patch: null, // Archives don't have patches
  } as HackInsert;

  const { error: insertErr } = await supabase.from("hacks").insert(insertPayload);
  if (insertErr) {
    return { ok: false, error: insertErr.message } as const;
  }

  if (!is_archive) {
    try {
      const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
      const reviewThread = await ensureHackReviewThread({
        slug,
        title,
        author: profile?.username ? `@${profile.username}` : user.id,
      });
      if (!reviewThread && process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
        await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [{
          title: `Review thread creation failed: ${title}`,
          description: "The hack was saved, but its Discord review thread could not be created.",
          color: 0xef4444,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${slug}`,
        }]);
      }
    } catch (error) {
      console.error(`[HackReview] Failed to create a review thread for ${slug}:`, error);
      if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
        await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [{
          title: `Review thread creation failed: ${title}`,
          description: "The hack was saved, but its Discord review thread could not be created.",
          color: 0xef4444,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${slug}`,
        }]);
      }
    }
  }

  // Tags: restrict to existing only (order follows form submission)
  if (tags.length > 0) {
    const catalog = await getCachedTagsWithUsage();
    const resolved = resolveTagIdsInOrder(tags, catalog);
    if (resolved.length > 0) {
      const hackTags = resolved.map((t, i) => ({ hack_slug: slug, tag_id: t.id, order: i + 1 }));
      const { error: htErr } = await supabase.from("hack_tags").insert(hackTags);
      if (htErr) return { ok: false, error: htErr.message } as const;
    }
  }

  return { ok: true, slug } as const;
}

export async function saveHackCovers(args: { slug: string; coverUrls: string[] }) {
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

  // Insert covers (overwrite positions)
  if (args.coverUrls && args.coverUrls.length > 0) {
    // Clear any existing rows first (idempotency on retry)
    await supabase.from("hack_covers").delete().eq("hack_slug", args.slug);
    const rows = args.coverUrls.map((url, idx) => ({ hack_slug: args.slug, url, position: idx + 1 }));
    const { error: cErr } = await supabase.from("hack_covers").insert(rows);
    if (cErr) return { ok: false, error: cErr.message } as const;
  }

  return { ok: true } as const;
}

export async function presignPatchAndSaveCovers(args: {
  slug: string;
  version: string;
  coverUrls: string[];
  objectKey: string;
}) {
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

  // Insert covers (overwrite positions)
  if (args.coverUrls && args.coverUrls.length > 0) {
    // Clear any existing rows first (idempotency on retry)
    await supabase.from("hack_covers").delete().eq("hack_slug", args.slug);
    const rows = args.coverUrls.map((url, idx) => ({ hack_slug: args.slug, url, position: idx + 1 }));
    const { error: cErr } = await supabase.from("hack_covers").insert(rows);
    if (cErr) return { ok: false, error: cErr.message } as const;
  }
  const client = getMinioClient();
  // 10 minutes to upload
  const url = await client.presignedPutObject(PATCHES_BUCKET, args.objectKey, 60 * 10);

  return { ok: true, presignedUrl: url, objectKey: args.objectKey } as const;
}

export async function confirmPatchUpload(args: { slug: string; objectKey: string; version: string, firstUpload?: boolean; publishAutomatically?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, title, current_patch, original_author, permission_from, is_archive, approved, verification_contact_info")
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

  // Enforce unique version per hack defensively (avoid race with presign step)
  const { data: existing, error: vErr } = await supabase
    .from("patches")
    .select("id")
    .eq("parent_hack", args.slug)
    .eq("version", args.version)
    .maybeSingle();
  if (vErr) return { ok: false, error: vErr.message } as const;
  if (existing) return { ok: false, error: "That version already exists for this hack." } as const;

  let shouldPublishAutomatically = !!args.publishAutomatically;
  if (shouldPublishAutomatically) {
    const { data: customPatcherRows, error: customPatcherErr } = await supabase
      .from("hack_patcher_patches")
      .select("patch_id")
      .eq("hack_slug", args.slug)
      .limit(1);
    if (customPatcherErr) return { ok: false, error: customPatcherErr.message } as const;
    shouldPublishAutomatically = (customPatcherRows || []).length === 0;
  }

  // Create patch row
  const patchInsert: any = {
    bucket: PATCHES_BUCKET,
    filename: args.objectKey,
    version: args.version,
    parent_hack: args.slug,
    format: patchFormatFromObjectKey(args.objectKey),
  };

  // Set published status based on publishAutomatically flag
  if (shouldPublishAutomatically) {
    patchInsert.published = true;
    patchInsert.published_at = new Date().toISOString();
  } else {
    patchInsert.published = false;
  }

  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .insert(patchInsert)
    .select("id, created_at")
    .single();
  if (pErr) return { ok: false, error: pErr.message } as const;

  // Only update current_patch if publishAutomatically is true
  if (shouldPublishAutomatically) {
    // Check if this patch is newer than current_patch
    let shouldUpdateCurrentPatch = true;
    if (hack.current_patch) {
      const { data: currentPatch } = await supabase
        .from("patches")
        .select("created_at")
        .eq("id", hack.current_patch)
        .maybeSingle();
      if (currentPatch && new Date(patch.created_at) <= new Date(currentPatch.created_at)) {
        shouldUpdateCurrentPatch = false;
      }
    }

    if (shouldUpdateCurrentPatch) {
      const { error: uErr } = await supabase
        .from("hacks")
        .update({ current_patch: patch.id })
        .eq("slug", args.slug);
      if (uErr) return { ok: false, error: uErr.message } as const;
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", hack.created_by)
    .single();
  const displayName = profile?.username ? `@${profile.username}` : hack.created_by;
  const uploadedByDifferentUser = hack.created_by !== user.id;
  const embed: APIEmbed = args.firstUpload ? {
    title: `:tada: ${hack.title}`,
    description: `A new hack by **${displayName}** is pending approval by an admin.`
      + (uploadedByDifferentUser ? ` (Uploaded by ${user.id})` : "")
      + (hack.verification_contact_info ? `\n\n**Verification contact info:**\n${hack.verification_contact_info}` : ""),
    color: 0x40f56a,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${args.slug}`,
    footer: { text: "This message brought to you by Hackdex" },
  } : {
    title: `New update for ${hack.title}`,
    description: `**${hack.title}** has been updated to **${args.version}**`,
    color: 0x40f56a,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${args.slug}`,
    footer: {
      text: hack.approved
        ? "This message brought to you by Hackdex"
        : "This hack is still pending approval",
    },
  };

  let reviewThread = null;
  let reviewLookupSucceeded = false;
  if (!hack.is_archive) {
    try {
      reviewThread = await getHackReviewThread(args.slug);
      reviewLookupSucceeded = true;
      if (!reviewThread && args.firstUpload) {
        reviewThread = await ensureHackReviewThread({
          slug: args.slug,
          title: hack.title,
          author: displayName,
        });
      }
    } catch (error) {
      console.error(`[HackReview] Failed to load or create the review thread for ${args.slug}:`, error);
    }
  }

  if (reviewThread) {
    await postHackReviewMessage(reviewThread, { embeds: [embed] });
  } else if (reviewLookupSucceeded && process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
    await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [embed]);
  }

  if (hack.approved && process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL) {
    await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL, [embed]);
  }

  // Redirect to versions page if not publishing automatically, otherwise to hack page
  const redirectTo = args.publishAutomatically ? `/hack/${args.slug}` : `/hack/${args.slug}/versions`;
  return { ok: true, patchId: patch.id, redirectTo } as const;
}



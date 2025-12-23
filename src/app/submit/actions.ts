"use server";

import { createClient } from "@/utils/supabase/server";
import type { TablesInsert } from "@/types/db";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { APIEmbed } from "discord-api-types/v10";
import { slugify } from "@/utils/format";
import { checkEditPermission, checkPatchEditPermission } from "@/utils/hack";

type HackInsert = TablesInsert<"hacks">;

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
  const version = (formData.get("version") as string)?.trim();
  const box_art = (formData.get("box_art") as string)?.trim() || null;
  const discord = (formData.get("discord") as string)?.trim();
  const twitter = (formData.get("twitter") as string)?.trim();
  const pokecommunity = (formData.get("pokecommunity") as string)?.trim();
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const original_author = (formData.get("original_author") as string)?.trim() || null;
  const permission_from = (formData.get("permission_from") as string)?.trim() || null;
  const isArchive = formData.get("isArchive") === "true";

  // For archives, version is not required; for regular hacks, it is
  if (!title || !summary || !description || !base_rom || !language || (!isArchive && !version)) {
    return { ok: false, error: "Missing required fields" } as const;
  }

  // For archives, original_author is required
  if (isArchive && !original_author) {
    return { ok: false, error: "Original author is required for Archive hacks" } as const;
  }

  const baseSlug = slugify(title);
  const slug = await ensureUniqueSlug(baseSlug, supabase);

  const social_links: HackInsert["social_links"] =
    discord || twitter || pokecommunity
      ? {
          discord: discord || undefined,
          twitter: twitter || undefined,
          pokecommunity: pokecommunity || undefined,
        }
      : null;

  const insertPayload: HackInsert = {
    slug,
    title,
    summary,
    description,
    base_rom,
    language,
    version: version || "Archive",
    created_by: user.id,
    downloads: 0,
    box_art,
    social_links,
    approved: isArchive, // Auto-approve archives
    patch_url: "",
    original_author: original_author || null,
    permission_from: permission_from || null,
    current_patch: null, // Archives don't have patches
  } as HackInsert;

  const { error: insertErr } = await supabase.from("hacks").insert(insertPayload);
  if (insertErr) {
    return { ok: false, error: insertErr.message } as const;
  }

  // Tags: restrict to existing only
  if (tags.length > 0) {
    const { data: existingTags, error: tagErr } = await supabase
      .from("tags")
      .select("id, name")
      .in("name", tags);
    if (tagErr) return { ok: false, error: tagErr.message } as const;
    if (existingTags && existingTags.length > 0) {
      const hackTags = existingTags.map((t, i) => ({ hack_slug: slug, tag_id: t.id, order: i + 1 }));
      const { error: htErr } = await supabase.from("hack_tags").insert(hackTags);
      if (htErr) return { ok: false, error: htErr.message } as const;
    }
  }

  if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const displayName = profile?.username ? `@${profile.username}` : user.id;

    const embed: APIEmbed = {
      title: `Hack submission: ${title}`,
      description: `A new hack by **${displayName}** is being prepared for submission.`,
      color: 0x40f56a,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${slug}`,
      footer: {
        text: `This message brought to you by Hackdex`
      }
    }
    await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [
      embed,
    ]);
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
    .select("slug, created_by, current_patch, original_author, permission_from")
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
  // desired object key; if omitted we build from slug+version
  objectKey?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Ensure hack exists and user has permission
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from")
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

  const safeVersion = args.version.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const objectKey = args.objectKey || `${args.slug}-${safeVersion}.bps`;

  const client = getMinioClient();
  // 10 minutes to upload
  const url = await client.presignedPutObject(PATCHES_BUCKET, objectKey, 60 * 10);

  return { ok: true, presignedUrl: url, objectKey } as const;
}

export async function confirmPatchUpload(args: { slug: string; objectKey: string; version: string, firstUpload?: boolean; publishAutomatically?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, title, current_patch, original_author, permission_from")
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

  // Create patch row
  const patchInsert: any = {
    bucket: PATCHES_BUCKET,
    filename: args.objectKey,
    version: args.version,
    parent_hack: args.slug,
  };

  // Set published status based on publishAutomatically flag
  if (args.publishAutomatically) {
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
  if (args.publishAutomatically) {
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

  if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', hack.created_by).single();
    const displayName = profile?.username ? `@${profile.username}` : hack.created_by;
    const uploadedByDifferentUser = hack.created_by !== user.id;

    const embed: APIEmbed = args.firstUpload ? {
      title: `:tada: ${hack.title}`,
      description: `A new hack by **${displayName}** is pending approval by an admin.` + (uploadedByDifferentUser ? ` (Uploaded by ${user.id})` : ''),
      color: 0x40f56a,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${args.slug}`,
      footer: {
        text: `This message brought to you by Hackdex`
      }
    } : {
      title: `New update for ${hack.title}`,
      description: `**${hack.title}** has been updated to **${args.version}**`,
      color: 0x40f56a,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${args.slug}`,
      footer: {
        text: `This message brought to you by Hackdex`
      }
    }

    const webhookUrl = args.firstUpload ?
      process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL :
      process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL || process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL;

    await sendDiscordMessageEmbed(webhookUrl, [
      embed,
    ]);
  }

  // Redirect to versions page if not publishing automatically, otherwise to hack page
  const redirectTo = args.publishAutomatically ? `/hack/${args.slug}` : `/hack/${args.slug}/versions`;
  return { ok: true, patchId: patch.id, redirectTo } as const;
}



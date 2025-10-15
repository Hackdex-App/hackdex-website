"use server";

import { createClient } from "@/utils/supabase/server";
import type { TablesInsert } from "@/types/db";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";

type HackInsert = TablesInsert<"hacks">;

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const version = (formData.get("version") as string)?.trim();
  const box_art = (formData.get("box_art") as string)?.trim() || null;
  const discord = (formData.get("discord") as string)?.trim();
  const twitter = (formData.get("twitter") as string)?.trim();
  const pokecommunity = (formData.get("pokecommunity") as string)?.trim();
  const tags = (formData.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [];

  if (!title || !summary || !description || !base_rom || !language || !version) {
    return { ok: false, error: "Missing required fields" } as const;
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
    version,
    created_by: user.id,
    downloads: 0,
    box_art,
    social_links,
    approved: false,
    patch_url: "",
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
      const hackTags = existingTags.map((t) => ({ hack_slug: slug, tag_id: t.id }));
      const { error: htErr } = await supabase.from("hack_tags").insert(hackTags);
      if (htErr) return { ok: false, error: htErr.message } as const;
    }
  }

  return { ok: true, slug } as const;
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

  // Ensure hack exists and belongs to user (created_by) to prevent spoof
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  if (hack.created_by !== user.id) return { ok: false, error: "Forbidden" } as const;

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

export async function confirmPatchUpload(args: { slug: string; objectKey: string; version: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  if (hack.created_by !== user.id) return { ok: false, error: "Forbidden" } as const;

  // Create patch row
  const { data: patch, error: pErr } = await supabase
    .from("patches")
    .insert({ bucket: PATCHES_BUCKET, filename: args.objectKey, version: args.version, parent_hack: args.slug })
    .select("id")
    .single();
  if (pErr) return { ok: false, error: pErr.message } as const;

  const { error: uErr } = await supabase
    .from("hacks")
    .update({ current_patch: patch.id })
    .eq("slug", args.slug);
  if (uErr) return { ok: false, error: uErr.message } as const;

  return { ok: true, patchId: patch.id, redirectTo: `/hack/${args.slug}` } as const;
}



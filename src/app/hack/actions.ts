"use server";

import { createClient } from "@/utils/supabase/server";
import type { TablesInsert } from "@/types/db";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APIEmbed } from "discord-api-types/v10";
import { sendDiscordMessageEmbed } from "@/utils/discord";

export async function updateHack(args: {
  slug: string;
  title?: string;
  summary?: string;
  description?: string;
  base_rom?: string;
  language?: string;
  version?: string;
  box_art?: string | null;
  social_links?: { discord?: string; twitter?: string; pokecommunity?: string } | null;
  tags?: string[];
}) {
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

  const updatePayload: TablesInsert<"hacks"> | any = {};
  if (args.title !== undefined) updatePayload.title = args.title;
  if (args.summary !== undefined) updatePayload.summary = args.summary;
  if (args.description !== undefined) updatePayload.description = args.description;
  if (args.base_rom !== undefined) updatePayload.base_rom = args.base_rom;
  if (args.language !== undefined) updatePayload.language = args.language;
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
    // Resolve desired tag IDs from names and compute diff against current links
    const { data: existingTags, error: tagErr } = await supabase
      .from("tags")
      .select("id, name")
      .in("name", args.tags);
    if (tagErr) return { ok: false, error: tagErr.message } as const;

    const desiredIds = Array.from(new Set((existingTags || []).map((t) => t.id)));

    const { data: currentLinks, error: curErr } = await supabase
      .from("hack_tags")
      .select("tag_id")
      .eq("hack_slug", args.slug);
    if (curErr) return { ok: false, error: curErr.message } as const;

    const currentIds = new Set((currentLinks || []).map((r: any) => r.tag_id as number));
    const desiredSet = new Set(desiredIds);

    const toAdd = desiredIds.filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !desiredSet.has(id));

    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from("hack_tags")
        .delete()
        .eq("hack_slug", args.slug)
        .in("tag_id", toRemove);
      if (delErr) return { ok: false, error: delErr.message } as const;
    }

    if (toAdd.length > 0) {
      const rows = toAdd.map((id) => ({ hack_slug: args.slug, tag_id: id }));
      const { error: insErr } = await supabase.from("hack_tags").insert(rows);
      if (insErr) return { ok: false, error: insErr.message } as const;
    }
  }

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
    .select("slug, created_by")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  if (hack.created_by !== user.id) return { ok: false, error: "Forbidden" } as const;

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
    // Best-effort removal of orphaned files
    await supabase.storage.from('hack-covers').remove(toRemove);
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

  return { ok: true } as const;
}


export async function presignNewPatchVersion(args: { slug: string; version: string; objectKey?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Ensure hack exists and belongs to user
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by")
    .eq("slug", args.slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  if (hack.created_by !== user.id) return { ok: false, error: "Forbidden" } as const;

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

export async function approveHack(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  // Check if user is admin
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { ok: false, error: "Forbidden" } as const;

  // Check if hack exists
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, approved, title")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;

  // If already approved, return success
  if (hack.approved) {
    revalidatePath(`/hack/${slug}`);
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

  if (process.env.DISCORD_WEBHOOK_ADMIN_URL) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
    await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_URL, [
      embed,
    ]);
  }

  revalidatePath(`/hack/${slug}`);
  redirect(`/hack/${slug}`);
}


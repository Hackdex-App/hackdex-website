"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";

export async function getArchives(args: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "title" | "created_at" | "original_author";
  sortOrder?: "asc" | "desc";
  filter?: "all" | "downloadable" | "informational";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  // Check if user is archiver (or admin)
  const { data: isArchiver } = await supabase.rpc("is_archiver");
  if (!isArchiver) {
    return { ok: false, error: "Forbidden" } as const;
  }

  // Use service role client to bypass RLS entirely and avoid recursion
  const serviceClient = await createServiceClient();

  const page = args.page || 1;
  const limit = args.limit || 50;
  const offset = (page - 1) * limit;
  const search = args.search?.trim() || "";
  const sortBy = args.sortBy || "created_at";
  const sortOrder = args.sortOrder || "desc";
  const filter = args.filter || "all";

  let query = serviceClient
    .from("hacks")
    .select("slug,title,original_author,base_rom,created_at,created_by,approved,permission_from,current_patch,is_archive", { count: "exact" })
    .eq("is_archive", true)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  // Apply archive type filter
  if (filter === "downloadable") {
    // Downloadable: permission_from is not null AND current_patch is not null
    query = query.not("permission_from", "is", null).not("current_patch", "is", null);
  } else if (filter === "informational") {
    // Informational: current_patch is null
    query = query.is("current_patch", null);
  }
  // "all" doesn't need additional filtering

  if (search) {
    query = query.or(`title.ilike.%${search}%,original_author.ilike.%${search}%,base_rom.ilike.%${search}%`);
  }

  const { data: hacks, error, count } = await query;

  if (error) {
    return { ok: false, error: error.message } as const;
  }

  // Fetch creator usernames
  const creatorIds = [...new Set((hacks || []).map((h) => h.created_by as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,username")
    .in("id", creatorIds);

  const usernameById = new Map<string, string | null>();
  (profiles || []).forEach((p) => usernameById.set(p.id, p.username));

  const archives = (hacks || []).map((h) => ({
    slug: h.slug,
    title: h.title,
    original_author: h.original_author,
    permission_from: h.permission_from,
    base_rom: h.base_rom,
    created_at: h.created_at,
    created_by: h.created_by,
    creator_username: usernameById.get(h.created_by as string) || null,
    approved: h.approved,
    current_patch: h.current_patch,
    is_archive: h.is_archive,
  }));

  return {
    ok: true,
    archives,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  } as const;
}

export async function deleteArchive(slug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Unauthorized" } as const;
  }

  // Only admins can delete archives
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { ok: false, error: "Forbidden" } as const;
  }

  // Verify it's an Archive hack
  const { data: hack } = await supabase
    .from("hacks")
    .select("slug, is_archive")
    .eq("slug", slug)
    .maybeSingle();

  if (!hack) {
    return { ok: false, error: "Archive not found" } as const;
  }

  if (!hack.is_archive) {
    return { ok: false, error: "This is not an Archive hack" } as const;
  }

  // Delete the hack (cascade will handle covers and tags)
  const { error: deleteError } = await supabase.from("hacks").delete().eq("slug", slug);

  if (deleteError) {
    return { ok: false, error: deleteError.message } as const;
  }

  return { ok: true } as const;
}

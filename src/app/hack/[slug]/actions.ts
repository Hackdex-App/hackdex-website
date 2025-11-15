"use server";

import { createClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";

export async function getSignedPatchUrl(slug: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Get user for permission check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch hack to validate it exists
  const { data: hack, error: hackError } = await supabase
    .from("hacks")
    .select("slug, approved, created_by, current_patch")
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

  // Check if patch exists
  if (hack.current_patch == null) {
    return { ok: false, error: "No patch available" };
  }

  // Fetch patch info
  const { data: patch, error: patchError } = await supabase
    .from("patches")
    .select("id, bucket, filename")
    .eq("id", hack.current_patch as number)
    .maybeSingle();

  if (patchError || !patch) {
    return { ok: false, error: "Patch not found" };
  }

  // Sign the URL server-side
  try {
    const client = getMinioClient();
    const bucket = patch.bucket || PATCHES_BUCKET;
    const signedUrl = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
    return { ok: true, url: signedUrl };
  } catch (error) {
    console.error("Error signing patch URL:", error);
    return { ok: false, error: "Failed to generate download URL" };
  }
}


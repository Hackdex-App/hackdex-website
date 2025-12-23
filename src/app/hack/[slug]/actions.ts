"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { isInformationalArchiveHack, canEditAsCreator } from "@/utils/hack";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { headers } from "next/headers";
import { validateEmail } from "@/utils/auth";
import { revalidatePath } from "next/cache";

export async function getSignedPatchUrl(slug: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Get user for permission check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch hack to validate it exists
  const { data: hack, error: hackError } = await supabase
    .from("hacks")
    .select("slug, approved, created_by, current_patch, original_author")
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
  if (process.env.DISCORD_WEBHOOK_ADMIN_URL) {
    try {
      await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_URL, [
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

  // Only allow downloading published, non-archived patches (or if user is creator)
  const { data: { user } } = await supabase.auth.getUser();
  if (!patch.published || patch.archived) {
    if (!user) {
      return { ok: false, error: "Unauthorized" };
    }
    // Check if user is creator
    if (!patch.parent_hack) {
      return { ok: false, error: "Unauthorized" };
    }
    const { data: hack } = await supabase
      .from("hacks")
      .select("created_by")
      .eq("slug", patch.parent_hack)
      .maybeSingle();

    if (!hack || hack.created_by !== user.id) {
      return { ok: false, error: "Unauthorized" };
    }
  }

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

export async function archivePatchVersion(slug: string, patchId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Fetch hack and verify permissions
  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator(hack, user.id)) {
    return { ok: false, error: "Forbidden" };
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

  // Archive the patch
  const serviceClient = await createServiceClient();
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq("id", patchId);

  if (updateErr) return { ok: false, error: updateErr.message };

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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator({ created_by: hack.created_by, current_patch: hack.current_patch, original_author: hack.original_author }, user.id)) {
    return { ok: false, error: "Forbidden" };
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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator(hack, user.id)) {
    return { ok: false, error: "Forbidden" };
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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator({ created_by: hack.created_by, current_patch: hack.current_patch, original_author: hack.original_author }, user.id)) {
    return { ok: false, error: "Forbidden" };
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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator({ created_by: hack.created_by, current_patch: hack.current_patch, original_author: hack.original_author }, user.id)) {
    return { ok: false, error: "Forbidden" };
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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator(hack, user.id)) {
    return { ok: false, error: "Forbidden" };
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

  // Check if this patch is newer than current_patch
  let willBecomeCurrent = false;
  const serviceClient = await createServiceClient();
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

  // Publish the patch
  const { error: updateErr } = await serviceClient
    .from("patches")
    .update({ published: true, published_at: new Date().toISOString() })
    .eq("id", patchId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // If newer than current_patch, update current_patch
  if (willBecomeCurrent) {
    const { error: updateHackErr } = await supabase
      .from("hacks")
      .update({ current_patch: patchId })
      .eq("slug", slug);
    if (updateHackErr) return { ok: false, error: updateHackErr.message };
  }

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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator({ created_by: hack.created_by, current_patch: hack.current_patch, original_author: hack.original_author }, user.id)) {
    return { ok: false, error: "Forbidden" };
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
    .select("slug, created_by, current_patch, original_author")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr || !hack) return { ok: false, error: "Hack not found" };

  if (!canEditAsCreator({ created_by: hack.created_by, current_patch: hack.current_patch, original_author: hack.original_author }, user.id)) {
    return { ok: false, error: "Forbidden" };
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

  revalidatePath(`/hack/${slug}/versions`);
  return { ok: true };
}


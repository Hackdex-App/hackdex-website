"use server";

import { createClient, createServiceClient } from "@/utils/supabase/server";
import type { TablesInsert } from "@/types/db";
import { objectExists, PATCHES_BUCKET } from "@/utils/minio/server";
import { sendDiscordMessageEmbed } from "@/utils/discord";
import { APIEmbed } from "discord-api-types/v10";
import { slugify } from "@/utils/format";
import { isPatchKeyFor } from "@/utils/storageKeys";
import { SUMMARY_MAX, TITLE_MAX } from "@/data/hackLimits";
import { baseRoms } from "@/data/baseRoms";
import { checkEditPermission, checkPatchEditPermission } from "@/utils/hack";
import type { PatchFormat } from "@/utils/patching";
import {
  ensureHackReviewThread,
  getHackReviewThread,
  postHackReviewMessage,
} from "@/utils/hack-review";
import { revalidateDiscoverCatalog } from "@/app/discover/revalidate";
import { revalidatePath, revalidateTag } from "next/cache";

type HackInsert = TablesInsert<"hacks">;

function patchFormatFromObjectKey(objectKey: string): PatchFormat {
  return objectKey.toLowerCase().endsWith(".xdelta") ? "xdelta" : "bps";
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Whether any hack already uses this slug. Uses the service client because RLS
 * hides other creators' drafts, which still own their slugs.
 */
async function isSlugTaken(slug: string) {
  const service = await createServiceClient();
  const { count, error } = await service.from("hacks").select("slug", { count: "exact", head: true }).eq("slug", slug);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Live availability check for the start form's page address. */
export async function checkSlugAvailable(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !SLUG_PATTERN.test(slug) || slug.length > 64) return false;
  return !(await isSlugTaken(slug));
}

export async function confirmPatchUpload(args: {
  slug: string;
  objectKey: string;
  version: string;
  firstUpload?: boolean;
  publishAutomatically?: boolean;
  /** The AI label stamp the uploader reviewed; required once the hack already has a version. */
  aiReviewedAt?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, created_by, title, current_patch, original_author, permission_from, is_archive, approved, assigned_admin, verification_contact_info, submitted_at, ai_disclosed_at")
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
  // Only a key signed for this hack, so nobody can register another hack's file.
  if (!isPatchKeyFor(args.slug, args.objectKey)) return { ok: false, error: "Invalid patch upload" } as const;
  if (!(await objectExists(PATCHES_BUCKET, args.objectKey))) return { ok: false, error: "The patch didn't finish uploading. Please try again." } as const;
  // Patch rows are server-only (RLS has no insert policy), so writes below use the service client.
  const service = await createServiceClient();
  const { count: keyUses } = await service.from("patches").select("id", { count: "exact", head: true }).eq("filename", args.objectKey);
  if (keyUses) return { ok: false, error: "That upload was already used. Please upload again." } as const;

  // New versions re-confirm the AI label. The client sends the stamp of the label it showed, so a
  // direct call can't skip the step and a label changed meanwhile isn't confirmed unseen. Archives
  // skip it: the label is optional there, since archivers may not know how the creator used AI.
  const { count: priorPatches } = await service.from("patches").select("id", { count: "exact", head: true }).eq("parent_hack", args.slug);
  const confirmsAi = !hack.is_archive && (priorPatches ?? 0) > 0;
  if (confirmsAi) {
    if (!hack.ai_disclosed_at) return { ok: false, error: "Add the AI label before uploading a new version." } as const;
    if (!args.aiReviewedAt || Date.parse(args.aiReviewedAt) !== Date.parse(hack.ai_disclosed_at)) {
      return { ok: false, error: "The AI label changed since you checked it. Review it again." } as const;
    }
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

  // A hack's first patch always becomes current: there's nothing else to play, and a draft's stays private anyway.
  let shouldPublishAutomatically = !!args.publishAutomatically || hack.current_patch === null;
  let didUpdateCurrentPatch = false;
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
  const patchInsert: TablesInsert<"patches"> = {
    bucket: PATCHES_BUCKET,
    filename: args.objectKey,
    version: args.version,
    parent_hack: args.slug,
    format: patchFormatFromObjectKey(args.objectKey),
    published: shouldPublishAutomatically,
    ...(shouldPublishAutomatically ? { published_at: new Date().toISOString() } : {}),
  };

  const { data: patch, error: pErr } = await service
    .from("patches")
    .insert(patchInsert)
    .select("id, created_at")
    .single();
  // The unique index catches a concurrent upload of the same version.
  if (pErr?.code === "23505") return { ok: false, error: "That version already exists for this hack." } as const;
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
      didUpdateCurrentPatch = true;
    }
  }

  if (confirmsAi) {
    const { error: aiErr } = await supabase.from("hacks").update({ ai_disclosed_at: new Date().toISOString() }).eq("slug", args.slug);
    if (aiErr) console.error(`[confirmPatchUpload] Couldn't re-stamp the AI label for ${args.slug}:`, aiErr);
  }

  if (hack.approved && didUpdateCurrentPatch) {
    revalidateDiscoverCatalog();
  }
  // Right after the writes, so a failed notification below can't skip it. The hack page reads
  // cached metadata (patch, version); without this it can show the old one for hours.
  revalidateTag(`hack:${args.slug}:metadata`);
  revalidatePath(`/hack/${args.slug}`);
  revalidatePath(`/hack/${args.slug}/versions`);

  // Notifications are best effort: the upload is already saved, so a Discord error mustn't report failure.
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", hack.created_by)
      .single();
    const displayName = profile?.username ? `@${profile.username}` : hack.created_by;
    const uploadedByDifferentUser = hack.created_by !== user.id;
    const embed: APIEmbed = args.firstUpload ? {
      title: hack.title,
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

    if (hack.approved) {
      if (process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL) {
        await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_HACKDEX_HACKS_URL, [embed]);
      }
    } else if (hack.submitted_at === null) {
      // Still a private draft: reviewers hear about it when the creator submits, not per upload.
    } else {
      let reviewThread = null;
      if (!hack.is_archive) {
        try {
          reviewThread = await getHackReviewThread(args.slug);
          if (!reviewThread && args.firstUpload) {
            reviewThread = await ensureHackReviewThread({
              slug: args.slug,
              title: hack.title,
              author: displayName,
              isClaimed: hack.assigned_admin !== null,
            });
          }
        } catch (error) {
          console.error(`[HackReview] Failed to load or create the review thread for ${args.slug}:`, error);
        }
      }

      if (reviewThread) {
        await postHackReviewMessage(reviewThread, { embeds: [embed] });
      } else if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
        await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [embed]);
      }
    }
  } catch (error) {
    console.error(`[confirmPatchUpload] Notification failed for ${args.slug}:`, error);
  }

  const redirectTo = args.publishAutomatically ? `/hack/${args.slug}` : `/hack/${args.slug}/versions`;
  return { ok: true, patchId: patch.id, redirectTo } as const;
}



/**
 * Starts a private draft from the three things a page needs (title, base ROM,
 * summary). The creator fills in the rest on the edit page and submits when
 * the checklist is clear. Nothing is visible to reviewers until then.
 */
export async function createDraft(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const base_rom = (formData.get("base_rom") as string | null)?.trim() ?? "";
  const summary = (formData.get("summary") as string | null)?.trim() ?? "";
  const behalf = formData.get("who") === "behalf";
  const original_author = behalf ? (formData.get("original_author") as string | null)?.trim() || null : null;
  const permission_from = behalf ? (formData.get("permission_from") as string | null)?.trim() || null : null;

  if (!title || !base_rom || summary.length < 10) return { ok: false, error: "Add a title, a base ROM, and a summary to continue." } as const;
  if (title.length > TITLE_MAX) return { ok: false, error: `Keep the title to ${TITLE_MAX} characters.` } as const;
  if (summary.length > SUMMARY_MAX) return { ok: false, error: `Keep the summary to ${SUMMARY_MAX} characters.` } as const;
  if (!baseRoms.some((r) => r.id === base_rom)) return { ok: false, error: "Choose a base ROM from the list." } as const;
  if (behalf && (!original_author || !permission_from)) return { ok: false, error: "Name the creator and where they gave permission." } as const;
  if (behalf) {
    // Listing someone else's hack is for archivers (admins included).
    const { data: isArchiver } = await supabase.rpc("is_archiver");
    if (!isArchiver) return { ok: false, error: "Only archivers can submit someone else's hack." } as const;
  }

  // The form sends the address it showed, so a taken one is an error rather than a silent "-2".
  const slug = (formData.get("slug") as string | null)?.trim() || slugify(title);
  if (!SLUG_PATTERN.test(slug) || slug.length > 64) return { ok: false, error: "Use lowercase letters, numbers, and dashes for the page address." } as const;
  if (await isSlugTaken(slug)) return { ok: false, error: "Another hack already uses this page address." } as const;

  const insertPayload: HackInsert = {
    slug,
    title,
    summary,
    description: "",
    base_rom,
    language: "English",
    completion_status: null,
    version: "",
    created_by: user.id,
    downloads: 0,
    approved: false,
    is_archive: false,
    patch_url: "",
    original_author,
    permission_from,
    current_patch: null,
    submitted_at: null,
  };
  const { error } = await supabase.from("hacks").insert(insertPayload);
  if (error) return { ok: false, error: error.message } as const;
  // Someone may have visited this address before it existed; that "not found" is cached.
  revalidateTag(`hack:${slug}:metadata`);
  return { ok: true, slug } as const;
}

/** What still stands between a draft and the review queue. Empty means it can be submitted. */
export async function getDraftChecklist(slug: string) {
  const supabase = await createClient();
  const [{ data: hack }, { count: covers }, { count: tags }] = await Promise.all([
    supabase.from("hacks").select("base_rom,summary,description,completion_status,language,original_author,permission_from,ai_disclosed_at,current_patch").eq("slug", slug).maybeSingle(),
    supabase.from("hack_covers").select("id", { count: "exact", head: true }).eq("hack_slug", slug),
    supabase.from("hack_tags").select("tag_id", { count: "exact", head: true }).eq("hack_slug", slug),
  ]);
  if (!hack) return null;
  const description = hack.description.trim();
  const required = [
    { key: "base", label: "Base ROM chosen", done: !!hack.base_rom },
    // Uploaded isn't enough: players need a current version to patch with.
    { key: "patch", label: "A playable patch uploaded", done: hack.current_patch !== null, href: "edit/patch" },
    { key: "summary", label: "Summary under 100 characters", done: hack.summary.trim().length > 0 && hack.summary.length <= 100 },
    { key: "description", label: "A description", done: description.length > 0 },
    { key: "completion", label: "Completion status set", done: !!hack.completion_status },
    { key: "shots", label: "At least one screenshot", done: (covers ?? 0) > 0 },
    { key: "tags", label: "At least one tag", done: (tags ?? 0) > 0 },
    { key: "ai", label: "AI label filled in", done: !!hack.ai_disclosed_at },
    ...(hack.original_author ? [{ key: "permission", label: "Where the creator gave permission", done: !!hack.permission_from }] : []),
  ];
  const recommended = [
    { key: "tags3", label: "Add at least 3 tags so players can find it", done: (tags ?? 0) >= 3 },
    { key: "long", label: "Description is short (under 200 characters)", done: description.replace(/\s+/g, " ").length >= 200 },
    { key: "shots3", label: "Three or more screenshots", done: (covers ?? 0) >= 3 },
  ];
  return { required, recommended };
}

/**
 * Moves a draft into the review queue: stamps submitted_at, opens the Discord
 * review thread, and tells the admins. Refuses while required items are open.
 * Pass `contact` to save the verification contact in the same step.
 */
export async function submitForReview(slug: string, contact?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" } as const;

  const { data: hack, error: hErr } = await supabase
    .from("hacks")
    .select("slug, title, created_by, approved, submitted_at, assigned_admin, verification_contact_info, is_archive, original_author, permission_from, current_patch")
    .eq("slug", slug)
    .maybeSingle();
  if (hErr) return { ok: false, error: hErr.message } as const;
  if (!hack) return { ok: false, error: "Hack not found" } as const;
  const permission = await checkEditPermission(hack, user.id, supabase);
  if (!permission.canEdit) return { ok: false, error: "Forbidden" } as const;
  if (hack.submitted_at !== null) return { ok: false, error: "This hack has already been submitted." } as const;

  const checklist = await getDraftChecklist(slug);
  const open = checklist?.required.filter((item) => !item.done) ?? [];
  if (open.length > 0) return { ok: false, error: `Still needed: ${open.map((i) => i.label[0].toLowerCase() + i.label.slice(1)).join(", ")}.` } as const;

  const submittedAt = new Date().toISOString();
  const verification = contact === undefined ? hack.verification_contact_info : contact.trim() || null;
  const { error: uErr } = await supabase.from("hacks").update({ submitted_at: submittedAt, verification_contact_info: verification }).eq("slug", slug);
  if (uErr) return { ok: false, error: uErr.message } as const;
  // The page reads cached metadata; without this it keeps showing "Draft".
  revalidateTag(`hack:${slug}:metadata`);
  revalidatePath(`/hack/${slug}`);

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", hack.created_by).single();
  const displayName = profile?.username ? `@${profile.username}` : hack.created_by;
  const embed: APIEmbed = {
    title: hack.title,
    description: `A new hack by **${displayName}** is pending approval by an admin.`
      + (verification ? `\n\n**Verification contact info:**\n${verification}` : ""),
    color: 0x40f56a,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/hack/${slug}`,
    footer: { text: "This message brought to you by Hackdex" },
  };
  try {
    const reviewThread = await ensureHackReviewThread({ slug, title: hack.title, author: displayName, isClaimed: hack.assigned_admin !== null });
    if (reviewThread) await postHackReviewMessage(reviewThread, { embeds: [embed] });
    else if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [embed]);
  } catch (error) {
    console.error(`[HackReview] Failed to announce ${slug} for review:`, error);
    // Best effort: the hack is already in the queue, so a Discord outage mustn't fail the submission.
    if (process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL) {
      await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_HACKS_URL, [embed]).catch((fallbackError) =>
        console.error(`[HackReview] Webhook fallback for ${slug} also failed:`, fallbackError),
      );
    }
  }
  return { ok: true, submittedAt } as const;
}

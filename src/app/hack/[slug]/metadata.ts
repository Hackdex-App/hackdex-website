import { createServiceClient } from "@/utils/supabase/server";
import { unstable_cache as cache } from "next/cache";
import { notFound, permanentRedirect } from "next/navigation";
import { AI_SELECT, aiDisclosureFromRow, type AiDisclosure } from "@/utils/aiDisclosure";
import { sortOrderedTags, getCoverUrls } from "@/utils/format";
import { Database } from "@/types/db";
import { getPatcherSelectablePatches } from "@/utils/patches/patcher-selectable-patches";
import { resolveHackDisplayVersion } from "@/utils/patches/hack-display-version";
import type { SelectablePatch } from "@/types/patcher";

// Page data for /hack/[slug]. These read with the service client, so they must
// stay out of "use server" files: every export there is a public endpoint that
// anyone can call directly, which leaked private drafts and creator emails.
// Callers gate what they render (drafts, admin-only email and contact).
//
// Every Supabase error throws instead of falling back to null or empty data.
// unstable_cache doesn't store rejections, so an outage can't get cached as a
// missing hack (404) or a page with no covers; the next request after Supabase
// recovers loads fresh data, and hack-page renders that throw keep serving the
// last good ISR page (or the error boundary if there isn't one yet).

export interface HackMetadata {
  hack: {
    slug: string;
    title: string;
    summary: string;
    description: string;
    base_rom: string;
    created_at: string;
    updated_at: string | null;
    current_patch: number | null;
    box_art: string | null;
    social_links: unknown;
    created_by: string;
    approved: boolean;
    original_author: string | null;
    permission_from: string | null;
    language: string | null;
    is_archive: boolean;
    completion_status: Database["public"]["Enums"]["Completion Status"] | null;
    verification_contact_info: string | null;
    /** null while the creator is still drafting; set once they submit for review. */
    submitted_at: string | null;
    /** Off when the creator lists their own emulators in the description. */
    show_emulators: boolean;
  };
  /** null until the creator fills in the AI disclosure form. */
  ai: AiDisclosure | null;
  displayVersion: string;
  images: string[];
  tags: string[];
  profile: {
    username: string | null;
    avatar_url: string | null;
    verified: boolean;
    email: string | null;
  } | null;
  otherHacks: {
    slug: string;
    title: string;
    summary: string;
  }[];
  /** The version a player gets by default: the version picker's default, else current_patch. */
  patch: {
    id: number;
    filename: string;
    version: string | null;
    created_at: string;
    changelog: string | null;
  } | null;
  patcherSelector: {
    selectablePatches: SelectablePatch[];
    defaultPatchId: number | null;
  };
}

/** null for missing and deleted hacks; pages that get null should call `hackNotFound`. Throws on Supabase errors. */
export async function getHackMetadata(slug: string): Promise<HackMetadata | null> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();

      const { data: hack, error } = await supabase
        .from("hacks")
        .select(`slug,title,summary,description,base_rom,created_at,updated_at,current_patch,custom_version_name,box_art,social_links,created_by,approved,original_author,permission_from,language,is_archive,completion_status,verification_contact_info,submitted_at,show_emulators,${AI_SELECT}`)
        .eq("slug", slug)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!hack) return null;

      // Security: Don't return verification_contact_info if hack is approved
      if (hack.approved) {
        hack.verification_contact_info = null;
      }

      // Fetch covers
      let images: string[] = [];
      const { data: covers, error: coversError } = await supabase
        .from("hack_covers")
        .select("url, position")
        .eq("hack_slug", slug)
        .order("position", { ascending: true });
      if (coversError) throw coversError;
      if (covers && covers.length > 0) {
        images = getCoverUrls(covers.map(c => c.url));
      }

      // Fetch tags
      const { data: tagRows, error: tagsError } = await supabase
        .from("hack_tags")
        .select("order,tags(name)")
        .eq("hack_slug", slug);
      if (tagsError) throw tagsError;

      const tags = sortOrderedTags(
        (tagRows || [])
          .map((r) => ({
            name: r.tags.name,
            order: r.order,
          }))
      ).map((t) => t.name);

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,verified")
        .eq("id", hack.created_by as string)
        .maybeSingle();
      if (profileError) throw profileError;

      // Meant to only be available to admins (gated in server-side page rendering)
      let userEmail: string | null = null;
      if (profile) {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.id);
        if (userError) throw userError;
        userEmail = userData?.user?.email || null;
      }

      // Get other approved hacks by the same author (non-archive hacks only)
      let otherHacks: {
        slug: string;
        title: string;
        summary: string;
      }[] = [];
      if (!hack.is_archive && !hack.original_author) {
        const { data: otherHacksData, error: otherHacksError } = await supabase
          .from("hacks")
          .select("slug,title,summary")
          .eq("created_by", hack.created_by)
          .eq("approved", true)
          .eq("is_archive", false)
          .is("deleted_at", null)
          .neq("slug", hack.slug)
          .order("downloads", { ascending: false })
          .limit(10);
        if (otherHacksError) throw otherHacksError;
        otherHacks = otherHacksData ?? [];
      }

      const { savedPatchIds, selectablePatches, defaultPatchId } = await getPatcherSelectablePatches(supabase, slug, hack.current_patch);

      // The page describes the version a player gets by default. With the version
      // picker on, that's the picker's default, and current_patch can lag behind it.
      const pagePatchId = defaultPatchId ?? hack.current_patch;
      let patch: HackMetadata["patch"] = null;
      if (pagePatchId != null) {
        const { data: patchData, error: patchError } = await supabase
          .from("patches")
          .select("id,filename,version,created_at,changelog")
          .eq("id", pagePatchId)
          .maybeSingle();
        if (patchError) throw patchError;
        if (patchData) {
          patch = {
            id: patchData.id,
            filename: patchData.filename,
            version: patchData.version || null,
            created_at: patchData.created_at,
            changelog: patchData.changelog || null,
          };
        }
      }

      const displayVersion = resolveHackDisplayVersion({
        isArchive: hack.is_archive,
        isCustomPatcherActive: savedPatchIds.length > 0,
        customVersionName: hack.custom_version_name,
        customDefaultPatchVersion: selectablePatches[0]?.version,
        currentPatchVersion: patch?.version,
      });

      return {
        hack,
        ai: aiDisclosureFromRow(hack),
        displayVersion,
        images,
        tags,
        profile: profile ? {
          username: profile.username,
          avatar_url: profile.avatar_url,
          verified: profile.verified,
          email: userEmail,
        } : null,
        otherHacks,
        patch,
        patcherSelector: {
          selectablePatches,
          defaultPatchId,
        }
      };
    },
    [`hack:${slug}:metadata`],
    {
      revalidate: 14400, // 4 hours
      tags: ["hack", `hack:${slug}:metadata`],
    }
  );

  return runner();
}

export async function getHackDownloads(slug: string): Promise<number | null> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();
      const { data: hack, error } = await supabase
        .from("hacks")
        .select("downloads")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      if (!hack) return null;
      return hack.downloads || 0;
    },
    [`hack:${slug}:downloads`],
    {
      revalidate: 600, // 10 minutes
      tags: ["hack", `hack:${slug}:downloads`],
    }
  );

  return runner();
}

/**
 * Ends a hack page render when the hack is missing. A deleted hack with a
 * redirect_url sends visitors there (308); anything else 404s.
 */
export async function hackNotFound(slug: string): Promise<never> {
  const runner = cache(
    async () => {
      const supabase = await createServiceClient();
      const { data, error } = await supabase
        .from("hacks")
        .select("redirect_url")
        .eq("slug", slug)
        .not("deleted_at", "is", null)
        .maybeSingle();
      if (error) throw error;
      return data?.redirect_url ?? null;
    },
    [`hack:${slug}:redirect`],
    {
      revalidate: 14400, // 4 hours
      // Shares the metadata tag so deleting a hack refreshes both.
      tags: ["hack", `hack:${slug}:metadata`],
    }
  );

  const redirectUrl = await runner();
  if (redirectUrl) permanentRedirect(redirectUrl);
  notFound();
}

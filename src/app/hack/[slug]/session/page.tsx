import { getHackDownloads, getHackMetadata, hackNotFound } from "@/app/hack/[slug]/metadata";
import {
  getHackPageMetadata,
  type HackDetailPageProps,
} from "@/app/hack/[slug]/hack-page-shared";
import HackDetailView, { type DraftEditorData } from "@/components/Hack/HackDetailView";
import { getDraftChecklist } from "@/app/submit/actions";
import { getCachedTagsWithUsage } from "@/data/tags";
import {
  checkEditPermission,
  checkPatchEditPermission,
  isArchiveHack,
} from "@/utils/hack";
import { getHackReviewThread } from "@/utils/hack-review";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: HackDetailPageProps) {
  const { slug } = await params;
  const metadata = await getHackMetadata(slug);
  let includeRestricted = false;
  if (metadata && (!metadata.hack.approved || isArchiveHack(metadata.hack))) {
    // Same gate as the page body; otherwise any signed-in visitor got a draft's title in <title>.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    includeRestricted = !!user && (await checkEditPermission(metadata.hack, user.id, supabase)).canEdit;
  }
  return getHackPageMetadata(slug, includeRestricted);
}

export default async function HackSessionDetail({
  params,
  searchParams,
}: HackDetailPageProps & { searchParams: Promise<{ preview?: string; edit?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { slug } = await params;
  const [metadata, downloads] = await Promise.all([
    getHackMetadata(slug),
    getHackDownloads(slug),
  ]);
  if (!metadata) {
    return hackNotFound(slug);
  }

  if (!user) {
    if (!metadata.hack.approved || isArchiveHack(metadata.hack)) {
      notFound();
    }

    return (
      <HackDetailView
        metadata={metadata}
        downloads={downloads}
        canEdit={false}
        canUploadPatch={false}
        isAdmin={false}
      />
    );
  }

  const { hack } = metadata;
  const userId = user.id;
  const {
    canEdit,
    canEditAsArchiver,
    isArchive,
  } = await checkEditPermission(hack, userId, supabase);
  const { canEdit: canUploadPatch } = await checkPatchEditPermission(
    hack,
    userId,
    supabase,
  );

  let isAdmin = false;
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin) {
    isAdmin = true;
  } else if (!hack.approved || isArchive) {
    if (isArchive && !canEditAsArchiver) {
      notFound();
    } else if (!canEdit) {
      notFound();
    }
  }

  const hasReviewThread =
    isAdmin && !isArchive
      ? Boolean(await getHackReviewThread(hack.slug))
      : false;

  // Hacks are edited in place here. Unlisted ones open in edit mode for their
  // creator (?preview=1 shows the player view); listed ones, and anyone else's
  // (an admin reviewing), show the player view until ?edit=1.
  const { preview, edit } = await searchParams;
  const isOwner = hack.created_by === userId;
  const editsInPlace = canEdit && !isArchive && ((isOwner && !hack.approved) || edit === "1");
  let editor: DraftEditorData | undefined;
  if (editsInPlace) {
    const [checklist, catalogTags, { data: covers }, { data: row }, { count: patchCount }] = await Promise.all([
      getDraftChecklist(slug),
      getCachedTagsWithUsage(),
      supabase.from("hack_covers").select("url").eq("hack_slug", slug).order("position", { ascending: true }),
      supabase.from("hacks").select("tags_updated_at").eq("slug", slug).maybeSingle(),
      supabase.from("patches").select("id", { count: "exact", head: true }).eq("parent_hack", slug),
    ]);
    if (checklist) {
      editor = {
        stage: hack.approved ? "listed" : hack.submitted_at === null ? "draft" : "review",
        notOwner: !isOwner,
        checklist,
        catalogTags,
        tagsUpdatedAt: row?.tags_updated_at ?? new Date(0).toISOString(),
        coverKeys: (covers ?? []).map((c) => c.url),
        preview: !hack.approved && preview === "1",
        hasPatches: (patchCount ?? 0) > 0,
      };
    }
  }

  // Admins looking at someone else's unsubmitted draft see how far along it is.
  const adminDraftChecklist = isAdmin && !editor && !hack.approved && hack.submitted_at === null ? await getDraftChecklist(slug) : null;
  const draftProgress = adminDraftChecklist ? { done: adminDraftChecklist.required.filter((r) => r.done).length, total: adminDraftChecklist.required.length } : undefined;

  return (
    <HackDetailView
      metadata={metadata}
      downloads={downloads}
      canEdit={canEdit}
      canUploadPatch={canUploadPatch}
      isAdmin={isAdmin}
      hasReviewThread={hasReviewThread}
      editor={editor}
      draftProgress={draftProgress}
    />
  );
}

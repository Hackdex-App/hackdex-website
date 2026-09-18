import { getHackDownloads, getHackMetadata } from "@/app/hack/[slug]/actions";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { slug } = await params;
  return getHackPageMetadata(slug, Boolean(user));
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
    notFound();
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

  // Hacks are edited in place here. Unlisted ones open in edit mode (?preview=1
  // shows the player view); listed ones show the player view until ?edit=1.
  const { preview, edit } = await searchParams;
  const editsInPlace = canEdit && !isArchive && (!hack.approved || edit === "1");
  let editor: DraftEditorData | undefined;
  if (editsInPlace) {
    const [checklist, catalogTags, { data: covers }, { data: row }] = await Promise.all([
      getDraftChecklist(slug),
      getCachedTagsWithUsage(),
      supabase.from("hack_covers").select("url").eq("hack_slug", slug).order("position", { ascending: true }),
      supabase.from("hacks").select("tags_updated_at").eq("slug", slug).maybeSingle(),
    ]);
    if (checklist) {
      editor = {
        stage: hack.approved ? "listed" : hack.submitted_at === null ? "draft" : "review",
        notOwner: hack.created_by !== userId,
        checklist,
        catalogTags,
        tagsUpdatedAt: row?.tags_updated_at ?? new Date(0).toISOString(),
        coverKeys: (covers ?? []).map((c) => c.url),
        preview: !hack.approved && preview === "1",
      };
    }
  }

  return (
    <HackDetailView
      metadata={metadata}
      downloads={downloads}
      canEdit={canEdit}
      canUploadPatch={canUploadPatch}
      isAdmin={isAdmin}
      hasReviewThread={hasReviewThread}
      editor={editor}
    />
  );
}

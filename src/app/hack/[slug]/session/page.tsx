import { getHackDownloads, getHackMetadata } from "@/app/hack/[slug]/actions";
import {
  getHackPageMetadata,
  type HackDetailPageProps,
} from "@/app/hack/[slug]/hack-page-shared";
import HackDetailView from "@/components/Hack/HackDetailView";
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
}: HackDetailPageProps) {
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

  return (
    <HackDetailView
      metadata={metadata}
      downloads={downloads}
      canEdit={canEdit}
      canUploadPatch={canUploadPatch}
      isAdmin={isAdmin}
      hasReviewThread={hasReviewThread}
    />
  );
}

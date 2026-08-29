import { getHackDownloads, getHackMetadata } from "@/app/hack/[slug]/actions";
import {
  getHackPageMetadata,
  type HackDetailPageProps,
} from "@/app/hack/[slug]/hack-page-shared";
import HackDetailView from "@/components/Hack/HackDetailView";
import { createServiceClient } from "@/utils/supabase/server";
import { isArchiveHack } from "@/utils/hack";
import { notFound } from "next/navigation";

export const dynamic = "error";

export async function generateStaticParams() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SECRET_KEY
  ) {
    return [];
  }

  const supabase = await createServiceClient();
  const { data: hacks } = await supabase
    .from("hacks")
    .select("slug")
    .eq("approved", true)
    .eq("is_archive", false)
    .order("downloads", { ascending: false })
    .limit(100);

  return (hacks || []).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: HackDetailPageProps) {
  const { slug } = await params;
  return getHackPageMetadata(slug, false);
}

export default async function HackDetail({ params }: HackDetailPageProps) {
  const { slug } = await params;
  const metadata = await getHackMetadata(slug);

  // Archive entries are currently available only through the signed-in route.
  if (!metadata || !metadata.hack.approved || isArchiveHack(metadata.hack)) {
    notFound();
  }

  const downloads = await getHackDownloads(slug);

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

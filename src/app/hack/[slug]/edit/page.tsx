import { notFound, redirect } from "next/navigation";
import HackForm from "@/components/Hack/HackForm";
import { createClient } from "@/utils/supabase/server";
import { FaChevronLeft } from "react-icons/fa6";
import Link from "next/link";
import { sortOrderedTags, getCoverUrls } from "@/utils/format";
import { checkEditPermission } from "@/utils/hack";
import { getCachedTagsWithUsage } from "@/data/tags";
import { AI_SELECT, aiDisclosureFromRow } from "@/utils/aiDisclosure";
import ArchiveAiLabel from "@/components/Hack/ArchiveAiLabel";

interface EditPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditHackPage({ params }: EditPageProps) {
  const { slug } = await params;
  const catalogTags = await getCachedTagsWithUsage();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/hack/${slug}`);
  }

  const { data: hack } = await supabase
    .from("hacks")
    .select(`slug,title,summary,description,base_rom,language,completion_status,box_art,social_links,created_by,current_patch,original_author,permission_from,is_archive,tags_updated_at,approved,submitted_at,${AI_SELECT}`)
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return notFound();

  const tagsUpdatedAt = new Date(hack.tags_updated_at);

  // Check if user can edit: either they're the creator, or they're admin/archiver editing an Archive hack
  const permission = await checkEditPermission(hack, user!.id, supabase);
  const { isInformationalArchive, isDownloadableArchive, isArchive } = permission;

  if (!permission.canEdit) {
    redirect(`/hack/${slug}`);
  }
  // Regular hacks are edited in place on the hack page; only archives use this form.
  if (!isArchive) {
    redirect(`/hack/${slug}?edit=1`);
  }

  let coverKeys: string[] = [];
  let signedCoverUrls: string[] = [];
  const { data: covers } = await supabase
    .from("hack_covers")
    .select("url, position")
    .eq("hack_slug", slug)
    .order("position", { ascending: true });
  if (covers && covers.length > 0) {
    coverKeys = covers.map((c: any) => c.url);
    signedCoverUrls = getCoverUrls(coverKeys);
  }

  const { data: tagRows } = await supabase
    .from("hack_tags")
    .select("order,tags(name)")
    .eq("hack_slug", slug);

  const tags = sortOrderedTags(
    (tagRows || [])
      .map((r) => ({
        name: r.tags.name,
        order: r.order,
      }))
  ).map((t) => t.name);

  let version = "";
  if (hack.current_patch) {
    const { data: currentPatch } = await supabase
      .from("patches")
      .select("version")
      .eq("id", hack.current_patch)
      .maybeSingle();
    version = currentPatch?.version || "";
  }

  const initial = {
    title: hack.title,
    summary: hack.summary,
    description: hack.description,
    base_rom: hack.base_rom,
    language: hack.language,
    completion_status: hack.completion_status,
    version: isArchive ? "Archive" : (version || "Pre-release"),
    box_art: hack.box_art,
    social_links: (hack.social_links as unknown) as {
      discord?: string;
      twitter?: string;
      pokecommunity?: string;
      github?: string;
    } | null,
    tags,
    coverKeys,
    signedCoverUrls,
  };

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pb-6 pt-4 md:pt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="font-display text-[28px] leading-tight md:text-[32px]">
          <span className="font-normal text-text-3">Edit</span> {hack.title}
        </h1>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Link href={`/hack/${slug}`} className="inline-flex h-10 items-center justify-center rounded-control border border-line-strong bg-surface px-3 text-sm font-medium transition-colors hover:border-text-3">
            <FaChevronLeft size={14} className="mr-1.5" />
            Back to hack
          </Link>
        </div>
      </div>
      <div className="mt-4 lg:mt-8">
        <HackForm mode="edit" slug={slug} initial={initial} catalogTags={catalogTags} tagsUpdatedAt={tagsUpdatedAt} />
      </div>
      <div className="mt-6">
        <ArchiveAiLabel slug={slug} initial={aiDisclosureFromRow(hack)} />
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import HackForm from "@/components/Hack/HackForm";
import { createClient } from "@/utils/supabase/server";
import { FaChevronLeft, FaChevronRight, FaPlus } from "react-icons/fa6";
import Link from "next/link";
import { sortOrderedTags, getCoverUrls } from "@/utils/format";
import { checkEditPermission } from "@/utils/hack";

interface EditPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditHackPage({ params }: EditPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/hack/${slug}`);
  }

  const { data: hack } = await supabase
    .from("hacks")
    .select("slug,title,summary,description,base_rom,language,box_art,social_links,created_by,current_patch,original_author,permission_from")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return notFound();

  // Check if user can edit: either they're the creator, or they're admin/archiver editing an Archive hack
  const permission = await checkEditPermission(hack, user!.id, supabase);
  const { isInformationalArchive, isDownloadableArchive, isArchive } = permission;

  if (!permission.canEdit) {
    redirect(`/hack/${slug}`);
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
    version: isArchive ? "Archive" : (version || "Pre-release"),
    box_art: hack.box_art,
    social_links: (hack.social_links as unknown) as { discord?: string; twitter?: string; pokecommunity?: string } | null,
    tags,
    coverKeys,
    signedCoverUrls,
  };

  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="flex items-center text-3xl tracking-tight">
          Edit
          <FaChevronRight size={22} className="inline-block mx-2 text-foreground/50 align-middle" />
          <span className="gradient-text font-bold">{hack.title}</span>
        </h1>
        <div className="flex items-center gap-2 md:flex-row flex-col md:self-end lg:self-auto mt-8 lg:mt-0">
          <Link href={`/hack/${slug}`} className="inline-flex items-center justify-center h-12 md:h-10 w-full md:w-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            <FaChevronLeft size={16} className="inline-block mr-1" />
            Back to hack
          </Link>
          {!isArchive && <>
            <Link
              href={`/hack/${slug}/versions`}
              className="inline-flex items-center justify-center h-12 md:h-10 w-full md:w-auto px-4 text-sm font-medium rounded-md border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
            >
              Manage Versions
            </Link>
            <Link
              href={`/hack/${slug}/edit/patch`}
              className="inline-flex items-center justify-center h-12 md:h-10 w-full md:w-auto px-4 text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] transition-colors"
            >
              <FaPlus size={14} className="mr-2" />
              Upload New Version
            </Link>
          </>}
        </div>
      </div>
      <div className="mt-4 lg:mt-8">
        <HackForm mode="edit" slug={slug} initial={initial} />
      </div>
    </div>
  );
}

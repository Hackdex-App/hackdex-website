import { notFound, redirect } from "next/navigation";
import HackForm from "@/components/Hack/HackForm";
import { createClient } from "@/utils/supabase/server";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import Link from "next/link";

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
    .select("slug,title,summary,description,base_rom,language,box_art,social_links,created_by,current_patch")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return notFound();
  if (hack.created_by !== user!.id) {
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
    const { data: urls } = await supabase.storage
      .from('hack-covers')
      .createSignedUrls(coverKeys, 60 * 5);
    if (urls) signedCoverUrls = urls.map((u) => u.signedUrl);
  }

  const { data: tagRows } = await supabase
    .from("hack_tags")
    .select("tags(name)")
    .eq("hack_slug", slug);
  const tags = (tagRows || []).map((r: any) => r.tags?.name).filter(Boolean) as string[];

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
    version: version || "Pre-release",
    box_art: hack.box_art,
    social_links: (hack.social_links as unknown) as { discord?: string; twitter?: string; pokecommunity?: string } | null,
    tags,
    coverKeys,
    signedCoverUrls,
  };

  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center text-3xl tracking-tight">
          Edit
          <FaChevronRight size={22} className="inline-block mx-2 text-foreground/50 align-middle" />
          <span className="gradient-text font-bold">{hack.title}</span>
        </h1>
        <div className="flex items-center gap-2">
          <Link href={`/hack/${slug}`} className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            <FaChevronLeft size={16} className="inline-block mr-1" />
            Back to hack
          </Link>
          <Link href={`/hack/${slug}/edit/patch`} className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
            Upload new version
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <HackForm mode="edit" slug={slug} initial={initial} />
      </div>
    </div>
  );
}

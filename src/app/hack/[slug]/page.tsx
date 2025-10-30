import { baseRoms } from "@/data/baseRoms";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Gallery from "@/components/Hack/Gallery";
import HackActions from "@/components/Hack/HackActions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Image from "next/image";
import { FaDiscord, FaTwitter } from "react-icons/fa6";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";
import { createClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import HackOptionsMenu from "@/components/Hack/HackOptionsMenu";
import DownloadsBadge from "@/components/Hack/DownloadsBadge";

interface HackDetailProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: HackDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: hack } = await supabase
    .from("hacks")
    .select("title,summary,approved")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack || !hack.approved) return { title: "Hack not found" };
  return {
    title: hack.title,
    description: hack.summary || undefined,
  };
}

export default async function HackDetail({ params }: HackDetailProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: hack, error } = await supabase
    .from("hacks")
    .select("slug,title,summary,description,base_rom,created_at,updated_at,downloads,current_patch,box_art,social_links,created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !hack) return notFound();
  const baseRom = baseRoms.find((r) => r.id === hack.base_rom);

  let images: string[] = [];
  const { data: covers } = await supabase
    .from("hack_covers")
    .select("url, position")
    .eq("hack_slug", slug)
    .order("position", { ascending: true });
  if (covers && covers.length > 0) {
    const { data: imagesData } = await supabase.storage
      .from('hack-covers')
      .createSignedUrls(covers.map(c => c.url), 60 * 5);
    if (imagesData) {
      images = imagesData.map(d => d.signedUrl);
    }
  }

  const { data: tagRows } = await supabase
    .from("hack_tags")
    .select("tags(name)")
    .eq("hack_slug", slug);
  const tags = (tagRows || []).map((r: any) => r.tags?.name).filter(Boolean) as string[];

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", hack.created_by as string)
    .maybeSingle();
  const author = profile?.username ? `@${profile.username}` : "Unknown";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const canEdit = !!user && user.id === (hack.created_by as string);

  // Resolve a short-lived signed patch URL (if current_patch exists)
  let signedPatchUrl = "";
  let patchVersion = "";
  let patchId: number | null = null;
  let lastUpdated: string | null = null;
  if (hack.current_patch != null) {
    const { data: patch } = await supabase
      .from("patches")
      .select("id,bucket,filename,version,created_at")
      .eq("id", hack.current_patch as number)
      .maybeSingle();
    if (patch) {
      const client = getMinioClient();
      const bucket = patch.bucket || PATCHES_BUCKET;
      signedPatchUrl = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
      patchVersion = patch.version || "";
      patchId = patch.id;
      lastUpdated = new Date(patch.created_at).toLocaleDateString();
    }
  }

  return (
    <div className="mx-auto max-w-screen-lg w-full pb-28">
      <HackActions
        title={hack.title}
        version={patchVersion || "Pre-release"}
        author={author}
        baseRomId={baseRom?.id || ""}
        platform={baseRom?.platform}
        patchUrl={signedPatchUrl}
        patchId={patchId ?? undefined}
        hackSlug={hack.slug}
      />

      <div className="pt-8 md:pt-10 px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-wrap md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hack.title}</h1>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-foreground/85 ring-1 ring-[var(--border)]">
                {patchVersion || "Pre-release"}
              </span>
            </div>
            <p className="mt-1 text-[15px] text-foreground/70">By {author}</p>
            <p className="mt-2 text-sm text-foreground/75">{hack.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs ring-1 ring-[var(--border)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <DownloadsBadge slug={hack.slug} initialCount={hack.downloads} />
            <HackOptionsMenu slug={hack.slug} canEdit={canEdit} />
          </div>
        </div>
      </div>

      <div className="mt-6 px-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6 lg:min-w-[640px]">
          <Gallery images={images} title={hack.title} />

          <div className="card p-5">
            <h2 className="text-xl font-semibold tracking-tight">About this hack</h2>
            <div className="prose prose-sm mt-3 max-w-none text-foreground/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>{hack.description}</ReactMarkdown>
            </div>
          </div>
        </div>

        <aside className="space-y-6 self-start w-full lg:w-auto">
          <div className="card p-5">
            <h3 className="text-[15px] font-semibold tracking-tight">Details</h3>
            <ul className="mt-3 grid gap-2 text-sm text-foreground/75">
              <li>Base ROM: {baseRom?.name || "Unknown"}</li>
              <li>Created: {new Date(hack.created_at).toLocaleDateString()}</li>
              {lastUpdated && <li>Last updated: {lastUpdated}</li>}
              {hack.social_links && (
                <li className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  {((hack.social_links as unknown) as { discord?: string })?.discord && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={((hack.social_links as unknown) as { discord?: string }).discord!} target="_blank" rel="noreferrer">
                      <FaDiscord size={32} />
                    </a>
                  )}
                  {((hack.social_links as unknown) as { twitter?: string })?.twitter && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={((hack.social_links as unknown) as { twitter?: string }).twitter!} target="_blank" rel="noreferrer">
                      <FaTwitter size={32} />
                    </a>
                  )}
                  {((hack.social_links as unknown) as { pokecommunity?: string })?.pokecommunity && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={((hack.social_links as unknown) as { pokecommunity?: string }).pokecommunity!} target="_blank" rel="noreferrer">
                      <PokeCommunityIcon width={32} height={32} color="currentColor" />
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
          {hack.box_art && (
            <div className="card overflow-hidden pb-6 lg:pb-0">
              <div className="flex items-center justify-between">
                <div className="px-5 py-3 text-[15px] font-semibold tracking-tight">Box art</div>
                <a
                  className="px-5 py-3 text-[15px] tracking-tight text-foreground/70 hover:underline"
                  href={hack.box_art}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
              <div className="relative aspect-square w-full max-h-[340px]">
                <Image src={hack.box_art} alt={`${hack.title} box art`} fill className="object-contain" unoptimized />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}


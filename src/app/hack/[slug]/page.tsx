import { baseRoms } from "@/data/baseRoms";
import { notFound } from "next/navigation";
import Gallery from "@/components/Hack/Gallery";
import HackActions from "@/components/Hack/HackActions";
import { formatCompactNumber } from "@/utils/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { FaDiscord, FaTwitter } from "react-icons/fa6";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";
import { createClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";

interface HackDetailProps {
  params: Promise<{ slug: string }>;
}

export default async function HackDetail({ params }: HackDetailProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: hack, error } = await supabase
    .from("hacks")
    .select("slug,title,summary,description,base_rom,version,created_at,updated_at,downloads,current_patch,box_art,social_links,created_by")
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
  const author = profile?.username || "Unknown";

  // Resolve a short-lived signed patch URL (if current_patch exists)
  let signedPatchUrl = "";
  if (hack.current_patch != null) {
    const { data: patch } = await supabase
      .from("patches")
      .select("id,bucket,filename")
      .eq("id", hack.current_patch as number)
      .maybeSingle();
    if (patch) {
      const client = getMinioClient();
      const bucket = patch.bucket || PATCHES_BUCKET;
      signedPatchUrl = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
    }
  }

  return (
    <div className="mx-auto max-w-screen-lg px-6 pb-28">
      <HackActions
        title={hack.title}
        version={hack.version}
        author={author}
        baseRom={baseRom?.name || ""}
        platform={baseRom?.platform}
        patchUrl={signedPatchUrl}
      />

      <div className="pt-8 md:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hack.title}</h1>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-foreground/85 ring-1 ring-[var(--border)]">
                {hack.version}
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
          <div className="inline-flex items-center gap-2 rounded-full ring-1 ring-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm text-foreground/85">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{formatCompactNumber(hack.downloads)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6 lg:min-w-[640px]">
          <Gallery images={images} title={hack.title} />

          <div className="card p-5">
            <h2 className="text-xl font-semibold tracking-tight">About this hack</h2>
            <div className="prose prose-sm mt-3 max-w-none text-foreground/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{hack.description}</ReactMarkdown>
            </div>
          </div>
        </div>

        <aside className="space-y-6 self-start w-full lg:w-auto">
          <div className="card p-5">
            <h3 className="text-[15px] font-semibold tracking-tight">Details</h3>
            <ul className="mt-3 grid gap-2 text-sm text-foreground/75">
              <li>Base ROM: {hack.base_rom}</li>
              <li>Format: BPS</li>
              <li>Created: {new Date(hack.created_at).toLocaleDateString()}</li>
              {hack.updated_at && (
                <li>Last updated: {new Date(hack.updated_at).toLocaleDateString()}</li>
              )}
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


import { baseRoms, PLATFORM_NAMES } from "@/data/baseRoms";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Gallery from "@/components/Hack/Gallery";
import HackActions from "@/components/Hack/HackActions";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import Image from "next/image";
import { FaDiscord, FaTwitter, FaTriangleExclamation } from "react-icons/fa6";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import HackOptionsMenu from "@/components/Hack/HackOptionsMenu";
import DownloadsBadge from "@/components/Hack/DownloadsBadge";
import type { CreativeWork, WithContext } from "schema-dts";
import serialize from "serialize-javascript";
import { headers } from "next/headers";
import { MenuItem } from "@headlessui/react";
import { FaCircleCheck } from "react-icons/fa6";

interface HackDetailProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  const supabase = await createServiceClient();
  const { data: hacks } = await supabase
    .from("hacks")
    .select("slug")
    .eq("approved", true)
    .order("downloads", { ascending: false })
    .limit(100); // Pre-render top 100 most popular hacks

  return (hacks || []).map((hack) => ({
    slug: hack.slug,
  }));
}

export async function generateMetadata({ params }: HackDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: hack } = await supabase
    .from("hacks")
    .select("title,summary,approved,base_rom,box_art,created_by,created_at,updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return { title: "Hack not found" };

  const { data: profile } = await supabase
  .from("profiles")
  .select("username")
  .eq("id", hack.created_by as string)
  .maybeSingle();
  const author = profile?.username ? `@${profile.username}` : undefined;

  if (!hack.approved) return {
    title: hack.title,
    description: 'This hack is pending approval by an admin.',
  } satisfies Metadata;

  const baseRomName = baseRoms.find((r) => r.id === hack.base_rom)?.name ?? "Pokémon";
  const pageUrl = `/hack/${slug}`;
  const title = `${hack.title} | ROM hack download`;
  const description = `Play ${hack.title}, a fan-made Pokémon ROM hack for ${baseRomName}. ${hack.summary}`;

  const keywords: string[] = [
    hack.title,
    `${hack.title} rom hack`,
    `${hack.title} patch`,
    `${hack.title} patcher`,
    `${hack.title} patched rom`,
    `${hack.title} rom download`,
    `${hack.title} download patch`,
    baseRomName,
    "Pokemon rom hack",
    "Pokemon patch file",
    `${baseRomName} rom hack`,
    `${baseRomName} patch file`,
  ];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      authors: author ? [author] : undefined,
      type: "article",
      publishedTime: new Date(hack.created_at).toISOString(),
      modifiedTime: hack.updated_at ? new Date(hack.updated_at).toISOString() : undefined,
      images: hack.box_art ? [
        {
          url: hack.box_art,
          alt: `${hack.title} ROM hack box art`,
        },
      ] : undefined,
    },
  } satisfies Metadata;
}

export default async function HackDetail({ params }: HackDetailProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: hack, error } = await supabase
    .from("hacks")
    .select("slug,title,summary,description,base_rom,created_at,updated_at,downloads,current_patch,box_art,social_links,created_by,approved")
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

  let isAdmin = false;
  if (!hack.approved && !canEdit) {
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin) {
      isAdmin = true;
    } else {
      return notFound();
    }
  }

  // Resolve a short-lived signed patch URL (if current_patch exists)
  let patchFilename: string | null = null;
  let signedPatchUrl = "";
  let patchVersion = "";
  let patchId: number | null = null;
  let lastUpdated: string | null = null;
  let patchCreatedAt: string | null = null;
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
      patchFilename = patch.filename;
      patchVersion = patch.version || "";
      patchId = patch.id;
      lastUpdated = new Date(patch.created_at).toLocaleDateString();
      patchCreatedAt = patch.created_at;
    }
  }

  // Build canonical URL, sameAs, dates, and JSON-LD
  const hdrs = await headers();
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : "";
  const proto = siteBase ? "" : (hdrs.get("x-forwarded-proto") || "https");
  const host = siteBase ? "" : (hdrs.get("host") || "");
  const baseUrl = siteBase || (proto && host ? `${proto}://${host}` : "");
  const pageUrl = baseUrl ? `${baseUrl}/hack/${hack.slug}` : `/hack/${hack.slug}`;

  const authorName = profile?.username || "Unknown";

  const sameAs: string[] = [];
  const social = (hack.social_links as unknown) as { discord?: string; twitter?: string; pokecommunity?: string } | null;
  if (social?.discord) sameAs.push(social.discord);
  if (social?.twitter) sameAs.push(social.twitter);
  if (social?.pokecommunity) sameAs.push(social.pokecommunity);

  const dateCreated = new Date(hack.created_at).toISOString();
  const modifiedRaw = patchCreatedAt || (hack.updated_at as string) || (hack.created_at as string);
  const dateModified = new Date(modifiedRaw).toISOString();
  // Add common tags to keywords
  const commonTags = ["Pokémon", "ROM Hack", "Patch", "BPS", "Romhack", "Pokemon", "Mod", "Game", "Hack"];
  if (baseRom) commonTags.push(PLATFORM_NAMES[baseRom.platform], baseRom.platform, baseRom.name);
  const keywords = tags.length ? [...tags, ...commonTags] : commonTags;

  const jsonLd: WithContext<CreativeWork> = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: hack.title,
    description: hack.summary || undefined,
    url: pageUrl || undefined,
    mainEntityOfPage: pageUrl || undefined,
    image: images.length ? images : undefined,
    thumbnailUrl: images.length ? images[0] : hack.box_art || undefined,
    author: { '@type': 'Person', name: authorName },
    sameAs: sameAs.length ? sameAs : undefined,
    genre: "Game Mod",
    dateCreated,
    dateModified,
    keywords: keywords,
    version: patchVersion || undefined,
    inLanguage: 'en',
    isAccessibleForFree: true,
    isBasedOn: baseRom ? {
      '@type': 'VideoGame',
      name: baseRom.name,
      gamePlatform: PLATFORM_NAMES[baseRom.platform],
    } : undefined,
  };

  return (
    <div className="mx-auto max-w-screen-lg w-full pb-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialize(jsonLd, { isJSON: true }) }}
      />
      <HackActions
        title={hack.title}
        version={patchVersion || "Pre-release"}
        author={author}
        baseRomId={baseRom?.id || ""}
        platform={baseRom?.platform}
        patchUrl={signedPatchUrl}
        patchFilename={patchFilename}
        patchId={patchId ?? undefined}
        hackSlug={hack.slug}
      />

      {!hack.approved && (
        isAdmin ? (
          <div className="mx-6 mt-6 rounded-lg border-2 border-yellow-500/60 bg-yellow-50 dark:bg-yellow-900/20 p-4 md:pl-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <FaTriangleExclamation className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  You are viewing this unpublished hack as an admin.
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This hack is pending approval. Please review the contents of this hack before making a decision. Then choose Approve from the dropdown options.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-6 mt-6 rounded-lg border-2 border-yellow-500/60 bg-yellow-50 dark:bg-yellow-900/20 p-4 md:pl-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <FaTriangleExclamation className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  This hack is pending approval.
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Your hack is currently under review and will be visible to all users once approved by an admin.
                </p>
              </div>
            </div>
          </div>
        )
      )}

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
          </div>
          <div className="w-full mt-2 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs ring-1 ring-[var(--border)]">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 self-end md:self-auto lg:min-w-[260px]">
              <DownloadsBadge slug={hack.slug} initialCount={hack.downloads} />
              <HackOptionsMenu slug={hack.slug} canEdit={canEdit}>
                {isAdmin && (
                  <MenuItem
                    as="a"
                    href={`/hack/${hack.slug}/approve`}
                    className="block w-full px-3 py-2 text-left text-sm text-green-500 font-medium data-focus:bg-black/5 dark:data-focus:bg-white/10"
                  >
                    <FaCircleCheck className="mr-2 inline-block align-middle mb-0.5 text-green-500" size={12} />
                    Approve
                  </MenuItem>
                )}
              </HackOptionsMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6 lg:min-w-[640px]">
          <Gallery images={images} title={hack.title} />

          <div className="card p-5">
            <h2 className="text-2xl font-semibold tracking-tight">About this hack</h2>
            <div className="prose prose-sm mt-3 max-w-none text-foreground/80">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug]}
                components={{
                  h1: 'h2',
                  h2: 'h3',
                  h3: 'h4',
                  h4: 'h5',
                  h5: 'h6',
                  h6: 'h6',
                }}
              >
                {hack.description}
              </ReactMarkdown>
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
          <div className="card overflow-hidden p-4 mt-4 text-sm text-foreground/60">
            <p>
              This page provides the official patch file for <span className="font-semibold">{hack.title}</span>. You can safely download the patched ROM for this hack
              using our built-in patcher.
            </p>
            <p className="mt-2">
              By pressing the "Patch Now" button, your browser will apply the downloaded <span className="font-semibold">Fire of Sky</span> .bps patch file to your legally-obtained <span className="font-semibold">{baseRom?.name}</span> ROM. The patched ROM will then be automatically downloaded.
            </p>
            <p className="mt-2">
              No pre-patched ROMs or base ROMs are hosted or distributed on this site. All patching is done locally on your device.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}


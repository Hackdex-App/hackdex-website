import { hacks } from "@/data/hacks";
import { notFound } from "next/navigation";
import Gallery from "@/components/Hack/Gallery";
import HackActions from "@/components/Hack/HackActions";
import { formatCompactNumber } from "@/utils/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { FaDiscord, FaTwitter } from "react-icons/fa6";
import PokeCommunityIcon from "@/components/Icons/PokeCommunityIcon";

interface HackDetailProps {
  params: Promise<{ slug: string }>;
}

export default async function HackDetail({ params }: HackDetailProps) {
  const { slug } = await params;
  const hack = hacks.find((h) => h.slug === slug) ?? notFound();

  return (
    <div className="mx-auto max-w-screen-lg px-6 pb-28">
      <HackActions title={hack.title} version={hack.version} author={hack.author} baseRom={hack.baseRom} />

      <div className="pt-8 md:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{hack.title}</h1>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-foreground/85 ring-1 ring-[var(--border)]">
                {hack.version}
              </span>
            </div>
            <p className="mt-1 text-[15px] text-foreground/70">By {hack.author}</p>
            <p className="mt-2 text-sm text-foreground/75">{hack.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {hack.tags.map((t) => (
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

      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Gallery images={hack.covers} title={hack.title} />

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
              <li>Base ROM: {hack.baseRom}</li>
              <li>Format: BPS</li>
              <li>Created: {new Date(hack.createdAt).toLocaleDateString()}</li>
              {hack.updatedAt && (
                <li>Last updated: {new Date(hack.updatedAt).toLocaleDateString()}</li>
              )}
              {hack.socialLinks && (
                <li className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  {hack.socialLinks.discord && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={hack.socialLinks.discord} target="_blank" rel="noreferrer">
                      <FaDiscord size={32} />
                    </a>
                  )}
                  {hack.socialLinks.twitter && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={hack.socialLinks.twitter} target="_blank" rel="noreferrer">
                      <FaTwitter size={32} />
                    </a>
                  )}
                  {hack.socialLinks.pokecommunity && (
                    <a className="underline underline-offset-2 hover:text-foreground/90 hover:scale-110 transition-transform duration-300" href={hack.socialLinks.pokecommunity} target="_blank" rel="noreferrer">
                      <PokeCommunityIcon width={32} height={32} color="currentColor" />
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
          {hack.boxArt && (
            <div className="card overflow-hidden pb-6 lg:pb-0">
              <div className="flex items-center justify-between">
                <div className="px-5 py-3 text-[15px] font-semibold tracking-tight">Box art</div>
                <a
                  className="px-5 py-3 text-[15px] tracking-tight text-foreground/70 hover:underline"
                  href={hack.boxArt}
                  download
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
              <div className="relative aspect-square w-full max-h-[340px]">
                <Image src={hack.boxArt} alt={`${hack.title} box art`} fill className="object-contain" unoptimized />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}


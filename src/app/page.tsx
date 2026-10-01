import { Metadata } from "next";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { getDiscoverData } from "@/app/discover/actions";
import { HomeHero, HowItWorksGate, ReadyShelf } from "@/components/Home/HomeHero";
import Shelf from "@/components/Home/Shelf";
import type { HackCardAttributes } from "@/components/HackCard";
import type { DiscoverHack } from "@/types/discover";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "error";
export const revalidate = 1800;

const SHELF_SIZE = 12;

const STEPS = [
  ["Link your base ROM", "Point Hackdex at your legally-obtained ROM file. It's verified and matched automatically."],
  ["It stays on your device", "Your ROM is cached locally in your browser, never uploaded, and ready whenever you come back."],
  ["Patch hack after hack", "Pick any hack built for your ROM and patch it in your browser in seconds, with no re-uploading between hacks."],
] as const;

/** Only what a card needs, so the whole catalog can ride along for the ready shelf without the discover extras. */
function toCard(h: DiscoverHack): HackCardAttributes {
  return {
    slug: h.slug,
    title: h.title,
    author: h.author,
    covers: h.covers,
    tags: h.tags,
    downloads: h.downloads,
    baseRomId: h.baseRomId,
    version: h.version,
    summary: h.summary,
    is_archive: h.is_archive,
    completion_status: h.completion_status,
  };
}

function byDateDesc(key: "approvedAt" | "publishedAt") {
  return (a: DiscoverHack, b: DiscoverHack) => (b[key] ? Date.parse(b[key]!) : 0) - (a[key] ? Date.parse(a[key]!) : 0);
}

export default async function Home() {
  const milestone = process.env.NEXT_PUBLIC_DOWNLOADS_MILESTONE?.trim() || undefined;
  const { hacks } = await getDiscoverData();
  const catalog = hacks.map(toCard);

  const trending = [...hacks].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, SHELF_SIZE).map(toCard);
  const newest = [...hacks].sort(byDateDesc("approvedAt")).slice(0, SHELF_SIZE).map(toCard);
  const updated = [...hacks].filter((h) => h.publishedAt).sort(byDateDesc("publishedAt")).slice(0, SHELF_SIZE).map(toCard);

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pt-2 md:pt-6">
      <HomeHero catalog={catalog} milestone={milestone} />

      <ReadyShelf catalog={catalog} />
      <Shelf title="Trending this week" blurb="Popular over the last few days." href="/discover" hacks={trending} />
      <Shelf title="New on Hackdex" blurb="The latest hacks to be listed." href="/discover?s=new" hacks={newest} />
      <Shelf title="Recently updated" blurb="Fresh patches from creators still at work." href="/discover?s=updated" hacks={updated} />

      <HowItWorksGate>
        <section className="scroll-mt-[76px] pt-3 md:pt-3" aria-labelledby="how">
          <h2 id="how" className="mb-4 text-[13px] font-semibold uppercase tracking-[.12em] text-text-3">
            How it works
          </h2>
          <ol className="relative grid gap-5 md:grid-cols-3 md:gap-6">
            <span className="absolute left-3.5 top-3.5 hidden h-px bg-line-strong md:block md:right-[calc(33.333%-14px)]" aria-hidden />
            {STEPS.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[28px_1fr] gap-x-3 md:block">
                <span className="relative z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full bg-bg text-[13px] font-bold text-accent-text shadow-[0_0_0_8px_var(--bg),inset_0_0_0_2px_var(--rose)]">
                  {i + 1}
                </span>
                <b className="self-center text-[15px] font-semibold md:mt-3 md:block">{title}</b>
                <p className="col-start-2 mt-1 text-sm text-text-2 md:max-w-[32ch]">{body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 flex justify-center md:mt-8">
            <Link
              href="/faq"
              prefetch={false}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm shadow-rest transition-colors hover:border-text-3 hover:bg-surface-2"
            >
              <span className="mr-0.5 font-medium">New to ROM hacks?</span> Read the FAQ <FiArrowRight className="h-3.5 w-3.5" />
            </Link>
          </p>
        </section>
      </HowItWorksGate>

      <p className="mt-7 flex justify-center md:mt-10">
        <Link
          href="/discover"
          prefetch={false}
          className="inline-flex h-12 w-full items-center justify-center rounded-control bg-surface-2 px-6 text-[15px] font-semibold text-text transition-colors hover:bg-line md:w-auto"
        >
          Browse all {catalog.length.toLocaleString()} hacks
        </Link>
      </p>
    </div>
  );
}

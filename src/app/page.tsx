import { Metadata } from "next";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";
import { createClient } from "@/utils/supabase/server";
import HackCard from "@/components/HackCard";
import Button from "@/components/Button";
import MilestoneCelebration from "@/components/Home/MilestoneCelebration";
import HeroPatchDiagram from "@/components/Home/HeroPatchDiagram";
import HeroAuthCta from "@/components/Home/HeroAuthCta";
import { sortOrderedTags, getCoverUrls } from "@/utils/format";
import { HackCardAttributes } from "@/components/HackCard";
import { resolveHackDisplayVersion } from "@/utils/patches/hack-display-version";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

// TODO: Lower to 3600 (1 hour) once we get more traffic
export const revalidate = 604800; // 1 week in seconds

export default async function Home() {
  const supabase = await createClient();

  // Fetch top 6 approved hacks ordered by downloads
  const { data: popularHacks } = await supabase
    .from("hacks")
    .select("slug,title,summary,description,base_rom,downloads,created_by,current_patch,custom_version_name,original_author,is_archive")
    .eq("approved", true)
    .not("current_patch", "is", null)
    .is("is_archive", false)
    .order("downloads", { ascending: false })
    .limit(6);

  let hackData: HackCardAttributes[] = [];
  if (popularHacks && popularHacks.length > 0) {
    const slugs = popularHacks.map((h) => h.slug);

    // Fetch covers
    const { data: coverRows } = await supabase
      .from("hack_covers")
      .select("hack_slug,url,position")
      .in("hack_slug", slugs)
      .order("position", { ascending: true });

    const coversBySlug = new Map<string, string[]>();
    if (coverRows && coverRows.length > 0) {      const coverKeys = coverRows.map((c) => c.url);
      const signedUrls = getCoverUrls(coverKeys);
      const urlToSignedUrl = new Map<string, string>();
      coverKeys.forEach((key, idx) => {
        urlToSignedUrl.set(key, signedUrls[idx]);
      });

      coverRows.forEach((c) => {
        const arr = coversBySlug.get(c.hack_slug) || [];
        const signed = urlToSignedUrl.get(c.url);
        if (signed) {
          arr.push(signed);
          coversBySlug.set(c.hack_slug, arr);
        }
      });
    }

    // Fetch tags
    const { data: tagRows } = await supabase
      .from("hack_tags")
      .select("hack_slug,order,tags(name,category)")
      .in("hack_slug", slugs);
    const tagsBySlug = new Map<string, { name: string; order: number }[]>();
    (tagRows || []).forEach((r: any) => {
      if (!r.tags?.name) return;
      const arr = tagsBySlug.get(r.hack_slug) || [];
      arr.push({
        name: r.tags.name,
        order: r.order,
      });
      tagsBySlug.set(r.hack_slug, arr);
    });

    // Fetch versions
    const patchIds = popularHacks
      .map((hack) => hack.current_patch)
      .filter((id): id is number => typeof id === "number");
    const versionsByPatchId = new Map<number, string>();
    if (patchIds.length > 0) {
      const { data: patchRows } = await supabase
        .from("patches")
        .select("id,version")
        .in("id", patchIds);
      (patchRows || []).forEach((patch) => {
        versionsByPatchId.set(patch.id, patch.version || "Pre-release");
      });
    }

    const customDefaultVersionsBySlug = new Map<string, string>();
    const customPatcherSlugs = new Set<string>();
    const { data: customPatchRows } = await supabase
      .from("hack_patcher_patches")
      .select("hack_slug, sort_order, patches!inner(version)")
      .in("hack_slug", slugs)
      .order("sort_order", { ascending: true });
    (customPatchRows || []).forEach((row: any) => {
      customPatcherSlugs.add(row.hack_slug);
      if (customDefaultVersionsBySlug.has(row.hack_slug)) return;
      const patch = Array.isArray(row.patches) ? row.patches[0] : row.patches;
      if (patch?.version) customDefaultVersionsBySlug.set(row.hack_slug, patch.version);
    });

    const mappedVersions = new Map<string, string>();
    popularHacks.forEach((hack) => {
      const currentPatchVersion = typeof hack.current_patch === "number"
        ? versionsByPatchId.get(hack.current_patch) || "Pre-release"
        : "";
      mappedVersions.set(hack.slug, resolveHackDisplayVersion({
        isArchive: hack.is_archive,
        isCustomPatcherActive: customPatcherSlugs.has(hack.slug),
        customVersionName: hack.custom_version_name,
        customDefaultPatchVersion: customDefaultVersionsBySlug.get(hack.slug),
        currentPatchVersion,
      }));
    });

    // Fetch profiles
    const userIds = [...new Set(popularHacks.map((h) => h.created_by).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username")
      .in("id", userIds);
    const usernameById = new Map<string, string>();
    (profiles || []).forEach((p) => usernameById.set(p.id, p.username ? `@${p.username}` : "Unknown"));

    // Map data to HackCard format
    hackData = popularHacks.map((r) => ({
      slug: r.slug,
      title: r.title,
      author: r.original_author ? r.original_author : usernameById.get(r.created_by as string) || "Unknown",
      covers: coversBySlug.get(r.slug) || [],
      tags: sortOrderedTags(tagsBySlug.get(r.slug) || []),
      downloads: r.downloads,
      baseRomId: r.base_rom,
      version: mappedVersions.get(r.slug) || "Pre-release",
      summary: r.summary,
      description: r.description,
      is_archive: false,
    }));
  }
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-screen-2xl px-6 pt-12 pb-8 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,42rem)]">
            <div>
              <MilestoneCelebration />
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl text-balance">
                Bring your ROM once.
                <br />
                <span className="gradient-text">Play everything it unlocks.</span>
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground/80">
                Link your legally-obtained base ROM one time and Hackdex caches it on your
                device. Patch any Pokémon ROM hack built for it, right in your browser,
                without ever re-uploading. Your files never leave your device.
              </p>
              <div className="mt-8 mx-auto flex w-full max-w-[320px] flex-col items-start gap-3 sm:mx-0 sm:max-w-none sm:flex-row sm:items-center">
                <Link
                  href="/discover"
                  className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md bg-[var(--accent)] px-5 text-base font-semibold sm:font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-700)] elevate"
                >
                  Explore hacks
                </Link>
                <Link
                  href="/submit"
                  className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md border border-white/10 bg-white/10 px-5 text-base font-semibold sm:font-medium text-foreground transition-colors hover:bg-white/15 elevate"
                >
                  Submit a patch
                </Link>
                <HeroAuthCta />
              </div>
              <p className="mt-6 text-xs text-foreground/60">
                Supports Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.
              </p>
            </div>
            <HeroPatchDiagram />
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-screen-2xl px-6 ${hackData.length > 0 ? "pt-6 sm:pt-12" : "py-6 sm:py-12"}`}>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-foreground/60">How it works</h2>
        <div className="relative mt-4 grid gap-8 sm:grid-cols-3 sm:gap-6">
          <div
            className="pointer-events-none absolute top-3.5 right-[calc(16.666%-0.875rem)] left-3.5 hidden h-px bg-[var(--border)] sm:block"
            aria-hidden="true"
          />
          <div>
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--background)] text-[13px] font-semibold text-[var(--accent)] shadow-[0_0_0_8px_var(--background)] ring-2 ring-[var(--accent)]/30">
              1
            </span>
            <div className="mt-3 text-[15px] font-semibold tracking-tight">Link your base ROM</div>
            <p className="mt-1 max-w-xs text-sm text-foreground/70">
              Point Hackdex at your legally-obtained ROM file. It&apos;s verified and matched automatically.
            </p>
          </div>
          <div>
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--background)] text-[13px] font-semibold text-[var(--accent)] shadow-[0_0_0_8px_var(--background)] ring-2 ring-[var(--accent)]/30">
              2
            </span>
            <div className="mt-3 text-[15px] font-semibold tracking-tight">It stays on your device</div>
            <p className="mt-1 max-w-xs text-sm text-foreground/70">
              Your ROM is cached locally in your browser, never uploaded, and ready whenever you come back.
            </p>
          </div>
          <div>
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--background)] text-[13px] font-semibold text-[var(--accent)] shadow-[0_0_0_8px_var(--background)] ring-2 ring-[var(--accent)]/30">
              3
            </span>
            <div className="mt-3 text-[15px] font-semibold tracking-tight">Patch hack after hack</div>
            <p className="mt-1 max-w-xs text-sm text-foreground/70">
              Pick any hack built for your ROM and patch it in your browser in seconds, with no re-uploading between hacks.
            </p>
          </div>
        </div>
        <div className="mt-12 mb-4 mx-auto flex flex-col items-center max-w-[320px] sm:mt-16">
          <Link href="/faq" className="inline-flex items-center rounded-full elevate border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 px-4 py-1.5 text-sm text-foreground hover:bg-black/10 dark:hover:bg-white/10">
            <span className="font-medium">New to Hackdex?</span>
            <span className="ml-1 underline underline-offset-2">Read the FAQ</span>
            <FaArrowRightLong size={12} aria-hidden className="ml-1" />
          </Link>
        </div>
      </section>

      {hackData.length > 0 && (
        <section className="mx-auto max-w-screen-2xl px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Popular ROM hacks</h2>
              <p className="mt-1 text-sm text-foreground/70">Most downloaded patches</p>
            </div>
            <Link
              href="/discover"
              className="text-sm font-medium text-foreground/80 hover:text-foreground hover:underline"
            >
              View all <FaArrowRightLong className="inline ml-1" size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hackData.map((hack) => (
              <HackCard key={hack.slug} hack={hack} prefetch={true} />
            ))}
          </div>
          <div className="sm:hidden flex justify-center mt-6">
            <Button
              variant="secondary"
              size="lg"
              className="w-48"
            >
              <Link href="/discover" className="inline-flex items-center">
                View all
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

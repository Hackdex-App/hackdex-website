import { Metadata } from "next";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";
import { createClient } from "@/utils/supabase/server";
import HackCard from "@/components/HackCard";
import Button from "@/components/Button";

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
    .select("slug,title,summary,description,base_rom,downloads,created_by,current_patch")
    .eq("approved", true)
    .order("downloads", { ascending: false })
    .limit(6);

  let hackData: any[] = [];
  if (popularHacks && popularHacks.length > 0) {
    const slugs = popularHacks.map((h) => h.slug);

    // Fetch covers
    const { data: coverRows } = await supabase
      .from("hack_covers")
      .select("hack_slug,url,position")
      .in("hack_slug", slugs)
      .order("position", { ascending: true });

    const coversBySlug = new Map<string, string[]>();
    if (coverRows && coverRows.length > 0) {
      const { data: imagesData } = await supabase.storage
        .from("hack-covers")
        .createSignedUrls(coverRows.map((c) => c.url), 60 * 5);
      if (imagesData) {
        const urlToSignedUrl = new Map<string, string>();
        imagesData.forEach((d, idx) => {
          if (d.signedUrl) urlToSignedUrl.set(coverRows[idx].url, d.signedUrl);
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
    }

    // Fetch tags
    const { data: tagRows } = await supabase
      .from("hack_tags")
      .select("hack_slug,tags(name,category)")
      .in("hack_slug", slugs);
    const tagsBySlug = new Map<string, string[]>();
    (tagRows || []).forEach((r: any) => {
      if (!r.tags?.name) return;
      const arr = tagsBySlug.get(r.hack_slug) || [];
      arr.push(r.tags.name);
      tagsBySlug.set(r.hack_slug, arr);
    });

    // Fetch versions
    let mappedVersions = new Map<string, string>();
    await Promise.all(
      popularHacks.map(async (r) => {
        if (r.current_patch) {
          const { data: currentPatch } = await supabase
            .from("patches")
            .select("version")
            .eq("id", r.current_patch)
            .maybeSingle();
          mappedVersions.set(r.slug, currentPatch?.version || "Pre-release");
        } else {
          mappedVersions.set(r.slug, "Pre-release");
        }
      })
    );

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
      author: usernameById.get(r.created_by as string) || "Unknown",
      covers: coversBySlug.get(r.slug) || [],
      tags: tagsBySlug.get(r.slug) || [],
      downloads: r.downloads,
      baseRomId: r.base_rom,
      version: mappedVersions.get(r.slug) || "Pre-release",
      summary: r.summary,
      description: r.description,
    }));
  }
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="gradient-text">Discover</span> and share Pokémon romhacks
            </h1>
            <p className="mt-4 text-[15px] text-foreground/80">
              Find community-made hacks and patch in-browser with your own legally-obtained base ROMs for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.
            </p>
            <div className="mt-12 sm:mt-8 mx-auto flex flex-col items-start max-w-[320px] sm:flex-row sm:items-center sm:max-w-none gap-3">
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
              <Link
                href="/login"
                className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md sm:px-5 text-base font-medium text-foreground/90 hover:underline"
              >
                Already a creator? Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-screen-2xl px-6 ${hackData.length > 0 ? "pt-6 sm:pt-12" : "py-6 sm:py-12"}`}>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Curated discovery</div>
            <p className="mt-1 text-sm text-foreground/70">Browse popular and trending patches across generations.</p>
          </div>
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Built-in patcher</div>
            <p className="mt-1 text-sm text-foreground/70">Provide your base ROMs and patch in the browser.</p>
          </div>
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Submit your own</div>
            <p className="mt-1 text-sm text-foreground/70">Join as a creator and submit your own rom hacks.</p>
          </div>
        </div>
        <div className="my-6 mx-auto flex flex-col items-center max-w-[320px] sm:mt-10">
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
              <HackCard key={hack.slug} hack={hack} />
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

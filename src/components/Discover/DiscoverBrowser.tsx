"use client";

import React from "react";
import HackCard from "@/components/HackCard";
import { createClient } from "@/utils/supabase/client";

export default function DiscoverBrowser() {
  const supabase = createClient();
  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState("popular");
  const [hacks, setHacks] = React.useState<any[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    const run = async () => {
      const { data: rows } = await supabase
        .from("hacks")
        .select("slug,title,summary,description,base_rom,version,downloads,created_by,patch_url")
        .order(sort === "popular" ? "downloads" : "created_at", { ascending: false });
      const slugs = (rows || []).map((r) => r.slug);
      const { data: coverRows } = await supabase
        .from("hack_covers")
        .select("hack_slug,url,position")
        .in("hack_slug", slugs)
        .order("position", { ascending: true });
      const coversBySlug = new Map<string, string[]>();
      if (coverRows && coverRows.length > 0) {
        const { data: imagesData } = await supabase.storage
          .from('hack-covers')
          .createSignedUrls(coverRows.map(c => c.url), 60 * 5);
        if (imagesData) {
          // Map: storage object url -> signedUrl
          const urlToSignedUrl = new Map<string, string>();
          imagesData.forEach((d, idx) => {
            // If creation fails, d.signedUrl might be undefined; filter those out
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
      const { data: tagRows } = await supabase
        .from("hack_tags")
        .select("hack_slug,tags(name)")
        .in("hack_slug", slugs);
      const tagsBySlug = new Map<string, string[]>();
      (tagRows || []).forEach((r: any) => {
        if (!r.tags?.name) return;
        const arr = tagsBySlug.get(r.hack_slug) || [];
        arr.push(r.tags.name);
        tagsBySlug.set(r.hack_slug, arr);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username");
      const usernameById = new Map<string, string>();
      (profiles || []).forEach((p) => usernameById.set(p.id, p.username ? `@${p.username}` : "Unknown"));

      const mapped = (rows || []).map((r) => ({
        slug: r.slug,
        title: r.title,
        author: usernameById.get(r.created_by as string) || "Unknown",
        covers: coversBySlug.get(r.slug) || [],
        tags: tagsBySlug.get(r.slug) || [],
        downloads: r.downloads,
        baseRomId: r.base_rom,
        version: r.version,
        summary: r.summary,
        description: r.description,
      }));

      setHacks(mapped);
      const tagSet = new Set<string>();
      mapped.forEach((h) => h.tags.forEach((t) => tagSet.add(t)));
      setTags(Array.from(tagSet).sort());
    };
    run();
  }, [sort]);

  const filtered = React.useMemo(() => {
    let out = hacks;
    const q = query.toLowerCase();
    if (q) {
      out = out.filter((h) =>
        h.title.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        (h.description || "").toLowerCase().includes(q)
      );
    }
    if (tag) out = out.filter((h) => h.tags.includes(tag));
    return out;
  }, [hacks, query, tag]);

  return (
    <div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or keyword"
            className="h-11 w-full rounded-md bg-[var(--surface-2)] px-3 text-sm text-foreground placeholder:text-foreground/60 ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="popular">Most popular</option>
          <option value="new">Newest</option>
        </select>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setTag(null)}
          className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors shadow-sm ${
            tag === null
              ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]"
              : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)]"
          }`}
        >
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors shadow-sm ${
              tag === t
                ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35 shadow-[inset_0_1px_0_rgba(0,0,0,0.04)]"
                : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 shadow-[inset_0_1px_0_rgba(0,0,0,0.03)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((hack) => (
          <HackCard key={hack.slug} hack={hack} />
        ))}
      </div>
    </div>
  );
}



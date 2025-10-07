"use client";

import React from "react";
import { hacks as allHacks } from "@/data/hacks";
import HackCard from "@/components/HackCard";

export default function DiscoverBrowser() {
  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState("popular");

  const tags = React.useMemo(() => {
    const set = new Set<string>();
    allHacks.forEach((h) => h.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, []);

  const hacks = React.useMemo(() => {
    let filtered = allHacks.filter((h) => {
      const q = query.toLowerCase();
      const matchesQ =
        !q ||
        h.title.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q);
      const matchesTag = !tag || h.tags.includes(tag);
      return matchesQ && matchesTag;
    });
    if (sort === "popular") filtered = filtered.sort((a, b) => b.downloads - a.downloads);
    if (sort === "new") filtered = filtered; // mock
    return filtered;
  }, [query, tag, sort]);

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
        {hacks.map((hack) => (
          <HackCard key={hack.slug} hack={hack} />
        ))}
      </div>
    </div>
  );
}



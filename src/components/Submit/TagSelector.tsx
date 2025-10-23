"use client";

import React from "react";
import { createClient } from "@/utils/supabase/client";
import { MdTune } from "react-icons/md";
import { CATEGORY_ICONS, getCategoryIcon } from "@/components/Icons/tagCategories";
import { FaTimes } from "react-icons/fa";

type TagRow = {
  id: number;
  name: string;
  category: string | null;
  popularity: number;
};

export interface TagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export default function TagSelector({ value, onChange }: TagSelectorProps) {
  const supabase = createClient();
  const [query, setQuery] = React.useState("");
  const [allTags, setAllTags] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeCategory, _setActiveCategory] = React.useState<string | "advanced" | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const categoryRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const categoriesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tagsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tagItemRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeTagIndex, setActiveTagIndex] = React.useState<number | null>(null);
  const [categoriesPaneFocused, setCategoriesPaneFocused] = React.useState(false);

  const setActiveCategory = React.useCallback((cat: string | "advanced" | null) => {
    _setActiveCategory(cat);
    setActiveTagIndex(null);
    setCategoriesPaneFocused(true);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("tags")
          .select("id,name,category,usage: hack_tags (count)");
        const rows: TagRow[] = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category ?? null,
          popularity: t.usage?.[0]?.count || 0,
        }));
        rows.sort((a, b) => (b.popularity - a.popularity) || a.name.localeCompare(b.name));
        setAllTags(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, TagRow[]>();
    const advanced: TagRow[] = [];
    for (const t of allTags) {
      if (!t.category) {
        advanced.push(t);
      } else {
        const arr = map.get(t.category) || [];
        arr.push(t);
        map.set(t.category, arr);
      }
    }
    // sort tags inside categories
    for (const [, arr] of map) arr.sort((a, b) => (b.popularity - a.popularity) || a.name.localeCompare(b.name));
    advanced.sort((a, b) => (b.popularity - a.popularity) || a.name.localeCompare(b.name));
    return { categories: Array.from(map.keys()).sort((a, b) => a.localeCompare(b)), byCat: map, advanced };
  }, [allTags]);

  // Filter categories and tags by query; hide categories with zero results. Keep selected tags visible.
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const categories: string[] = [];
    const byCat = new Map<string, TagRow[]>();
    for (const cat of grouped.categories) {
      const pool = (grouped.byCat.get(cat) || []);
      const list = q ? pool.filter((t) => t.name.toLowerCase().includes(q)) : pool;
      if (list.length > 0) {
        categories.push(cat);
        byCat.set(cat, list);
      }
    }
    const advPool = grouped.advanced;
    const advanced = q ? advPool.filter((t) => t.name.toLowerCase().includes(q)) : advPool;
    return { categories, byCat, advanced };
  }, [grouped, query, value]);

  // Ensure active category always has results; pick the first available when query changes
  React.useEffect(() => {
    const hasActive = activeCategory === "advanced"
      ? filtered.advanced.length > 0
      : !!activeCategory && filtered.byCat.get(activeCategory)?.length;
    if (!hasActive && categoriesPaneFocused) {
      if (filtered.categories.length > 0) setActiveCategory(filtered.categories[0]);
      else if (filtered.advanced.length > 0) setActiveCategory("advanced");
      else setActiveCategory(null);
    }
  }, [filtered, activeCategory, categoriesPaneFocused]);

  // Scroll category into view when active changes
  React.useEffect(() => {
    const el = activeCategory ? categoryRefs.current[activeCategory] : null;
    if (el) {
      try { el.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }, [activeCategory]);


  // Scroll active tag into view
  React.useEffect(() => {
    if (activeTagIndex == null) return;
    const el = tagItemRefs.current[activeTagIndex];
    if (el) {
      try { el.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }, [activeTagIndex]);

  function toggleTag(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  return (
    <div className="grid gap-2">
      {/* Selected tag pills */}
      <div className="flex max-h-24 flex-wrap gap-2 overflow-auto pr-1">
        {value.length > 0 ? value.map((t) => {
          const cat = grouped.categories.find((c) => (grouped.byCat.get(c) || []).some((r) => r.name === t)) || (grouped.advanced.some((r) => r.name === t) ? "Advanced" : undefined);
          const Icon = getCategoryIcon(cat === "Advanced" ? null : cat);
          return (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-[var(--border)]">
              {Icon ? <Icon className="h-3.5 w-3.5 opacity-80" /> : null}
              {t}
              <button type="button" onClick={() => toggleTag(t)} className="ml-1 text-foreground/70 hover:text-foreground hover:cursor-pointer"><FaTimes className="h-3 w-3" /></button>
            </span>
          );
        }) : <div className="px-2 py-0.5 text-sm text-foreground/60">No tags selected</div>}
      </div>

      {/* Persistent selector */}
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 backdrop-blur-xl shadow-xl">
        {/* Search input */}
        <div className="border-b border-[var(--border)] p-2">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const first = filtered.categories[0] || (filtered.advanced.length > 0 ? 'advanced' : null);
                if (!activeCategory && first) setActiveCategory(first);
                categoriesContainerRef.current?.focus();
              }
            }}
            placeholder={value.length ? "Search tags" : "Search tags (e.g. QoL, Challenge)"}
            className="w-full bg-transparent px-2 text-sm placeholder:text-foreground/50 focus:outline-none"
          />
        </div>

        <div className="flex h-80 divide-x divide-[var(--border)]">
          {/* Categories */}
          <div
            ref={categoriesContainerRef}
            tabIndex={0}
            onFocus={() => setCategoriesPaneFocused(true)}
            onBlur={() => setCategoriesPaneFocused(false)}
            onMouseLeave={() => setCategoriesPaneFocused(false)}
            onKeyDown={(e) => {
              const cats = [...filtered.categories, ...(filtered.advanced.length > 0 ? ['advanced'] : [])];
              const idx = activeCategory ? cats.indexOf(activeCategory) : -1;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = Math.min(cats.length - 1, (idx < 0 ? 0 : idx + 1));
                if (cats[next]) setActiveCategory(cats[next]);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = Math.max(0, (idx < 0 ? 0 : idx - 1));
                if (idx === 0) {
                  setActiveCategory(null);
                  setActiveTagIndex(null);
                  searchInputRef.current?.focus();
                } else if (cats[prev]) {
                  setActiveCategory(cats[prev]);
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const key = cats[idx >= 0 ? idx : 0];
                if (key) setActiveCategory(key);
                setActiveTagIndex(0);
                tagsContainerRef.current?.focus();
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const key = cats[idx >= 0 ? idx : 0];
                if (key) setActiveCategory(key);
              }
            }}
            role="listbox"
            aria-label="Tag categories"
            className="w-52 max-w-[60vw] overflow-auto p-2 outline-none"
          >
            <div className="mb-1 px-1 text-xs uppercase tracking-wider text-foreground/60">Categories</div>
            <div className="flex flex-col">
              {filtered.categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat];
                return (
                <div
                  key={cat}
                  ref={(el) => { categoryRefs.current[cat] = el; }}
                  role="option"
                  aria-selected={activeCategory === cat}
                  onMouseEnter={() => setActiveCategory(cat)}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                    activeCategory === cat
                      ? (categoriesPaneFocused ? 'bg-black/5 dark:bg-white/10' : 'bg-zinc-800/5 dark:bg-zinc-200/5 ring-1 ring-black/10 dark:ring-white/20')
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="truncate inline-flex items-center gap-2">{Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}{cat}</span>
                </div>
              );})}
              {filtered.advanced.length > 0 && (
                <div
                  ref={(el) => { categoryRefs.current['advanced'] = el; }}
                  role="option"
                  aria-selected={activeCategory === 'advanced'}
                  onMouseEnter={() => setActiveCategory('advanced')}
                  onClick={() => setActiveCategory('advanced')}
                  className={`mt-1 flex items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                    activeCategory === 'advanced'
                      ? (categoriesPaneFocused ? 'bg-black/5 dark:bg-white/10' : 'bg-zinc-800/5 dark:bg-zinc-200/5 ring-1 ring-black/10 dark:ring-white/20')
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><MdTune className="h-4 w-4" />Advanced</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div
            ref={tagsContainerRef}
            tabIndex={0}
            onMouseLeave={() => setActiveTagIndex(null)}
            onBlur={() => setActiveTagIndex(null)}
            onKeyDown={(e) => {
              const list = activeCategory
                ? (activeCategory === 'advanced' ? filtered.advanced : (filtered.byCat.get(activeCategory) || []))
                : [];
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (list.length > 0) setActiveTagIndex((i) => (i == null ? 0 : Math.min(list.length - 1, (i ?? 0) + 1)));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (list.length > 0) setActiveTagIndex((i) => (i == null ? 0 : Math.max(0, (i ?? 0) - 1)));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeTagIndex != null && list[activeTagIndex]) toggleTag(list[activeTagIndex].name);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setActiveTagIndex(null);
                (document.activeElement as HTMLElement | null)?.blur?.();
                categoriesContainerRef.current?.focus();
              }
            }}
            role="listbox"
            aria-label="Tags"
            className="min-w-[18rem] flex-1 overflow-auto p-2 outline-none"
          >
            <div className="mb-1 px-1 text-xs uppercase tracking-wider text-foreground/60">{activeCategory === "advanced" ? "Advanced" : (activeCategory || "Pick a category")}</div>
            <div className="grid gap-1 pr-1">
              {(activeCategory
                ? (activeCategory === "advanced" ? filtered.advanced : (filtered.byCat.get(activeCategory) || []))
                : []
              ).map((t, idx) => (
                <div
                  key={t.id}
                  ref={(el) => { tagItemRefs.current[idx] = el; }}
                  role="option"
                  aria-selected={activeTagIndex === idx}
                  onMouseEnter={() => setActiveTagIndex(idx)}
                  onClick={() => toggleTag(t.name)}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${activeTagIndex === idx ? 'bg-black/5 dark:bg-white/10' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                >
                  <span className="truncate">{t.name}</span>
                  <input type="checkbox" readOnly checked={value.includes(t.name)} className="h-4 w-4 accent-[var(--accent)]" />
                </div>
              ))}
              {!activeCategory && (
                <div className="px-2 py-1.5 text-sm text-foreground/60">Select a category</div>
              )}
              {activeCategory && (activeCategory === "advanced" ? filtered.advanced.length === 0 : (filtered.byCat.get(activeCategory)?.length || 0) === 0) && (
                <div className="px-2 py-1.5 text-sm text-foreground/60">No results</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {loading && <div className="text-xs text-foreground/60">Loading tags…</div>}
    </div>
  );
}



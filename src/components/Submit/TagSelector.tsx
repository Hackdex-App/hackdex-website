"use client";

import React from "react";
import type { CatalogTagRow } from "@/types/catalogTag";
import { createClient } from "@/utils/supabase/client";
import { MdTune } from "react-icons/md";
import { FiArrowDown, FiArrowLeft, FiArrowUp } from "react-icons/fi";
import { CATEGORY_ICONS } from "@/components/Icons/tagCategories";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

type TagRow = CatalogTagRow;

export interface TagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** When set, skips client Supabase fetch (use server-cached catalog). */
  catalogTags?: CatalogTagRow[];
  newTagsCutoff: Date | null;
  /** Closing control shown at the end of the picker's footer (the modal's Done). */
  done?: React.ReactNode;
}

/** Category row on desktop, a chip in the phone row. */
const CAT_ROW = "flex flex-none cursor-pointer items-center justify-between whitespace-nowrap rounded-full border border-line-strong px-3 py-1 text-left text-sm md:rounded-[6px] md:border-0 md:px-2 md:py-1.5";

const QUIET_BTN = "inline-flex h-8 flex-none items-center gap-1 whitespace-nowrap rounded-control px-2.5 text-[13px] font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text";
const OUTLINE_BTN = "inline-flex h-8 flex-none items-center whitespace-nowrap rounded-control border border-line-strong bg-surface px-2.5 text-[13px] font-medium text-text-2 transition-colors hover:border-text-3 hover:text-text data-open:border-text-3 data-open:text-text";

function compareTags(a: TagRow, b: TagRow, newTagsCutoff: Date | null): number {
  const aNew = !!(a.created_at && newTagsCutoff && new Date(a.created_at) > newTagsCutoff);
  const bNew = !!(b.created_at && newTagsCutoff && new Date(b.created_at) > newTagsCutoff);
  if (aNew && !bNew) return -1;
  if (!aNew && bNew) return 1;
  return (b.popularity - a.popularity) || a.name.localeCompare(b.name);
}

export default function TagSelector({ value, onChange, catalogTags, newTagsCutoff, done }: TagSelectorProps) {
  const supabase = createClient();
  const [query, setQuery] = React.useState("");
  const [allTags, setAllTags] = React.useState<TagRow[]>(() => catalogTags ?? []);
  const [loading, setLoading] = React.useState(() => catalogTags === undefined);
  const [activeCategory, _setActiveCategory] = React.useState<string | "advanced" | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const categoryRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const categoriesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tagsContainerRef = React.useRef<HTMLDivElement | null>(null);
  const tagItemRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeTagIndex, setActiveTagIndex] = React.useState<number | null>(null);
  const [categoriesPaneFocused, setCategoriesPaneFocused] = React.useState(false);
  const [reviewing, setReviewing] = React.useState(false);
  // The review view keeps the picker's height so the modal doesn't jump between views.
  const [height, setHeight] = React.useState<number>();
  const rootRef = React.useRef<HTMLDivElement>(null);

  const setActiveCategory = React.useCallback((cat: string | "advanced" | null) => {
    _setActiveCategory(cat);
    setActiveTagIndex(null);
    setCategoriesPaneFocused(true);
  }, []);

  const categoriesWithNewTags = React.useMemo(() => {
    const categories = new Set<string>();
    for (const t of allTags) {
      if (t.category && t.created_at && newTagsCutoff && new Date(t.created_at) > newTagsCutoff) {
        categories.add(t.category);
      }
    }
    return Array.from(categories);
  }, [allTags, newTagsCutoff]);

  React.useEffect(() => {
    if (catalogTags !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase
          .from("tags")
          .select("id,name,category,created_at,usage: hack_tags (count)");
        const rows: TagRow[] = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category ?? null,
          popularity: t.usage?.[0]?.count || 0,
          created_at: t.created_at ?? null,
        }));
        // Put new tags first, then sort by popularity and name
        rows.sort((a, b) => {
          return compareTags(a, b, newTagsCutoff);
        });
        if (!cancelled) setAllTags(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogTags, supabase, newTagsCutoff]);

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
    // Put new tags first, then sort by popularity and name
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        return compareTags(a, b, newTagsCutoff);
      });
    }
    advanced.sort((a, b) => {
      return compareTags(a, b, newTagsCutoff);
    });
    return { categories: Array.from(map.keys()).sort((a, b) => a.localeCompare(b)), byCat: map, advanced };
  }, [allTags, newTagsCutoff]);

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

  // Open on the first category rather than an empty pane.
  React.useEffect(() => {
    if (activeCategory === null && grouped.categories.length > 0) _setActiveCategory(grouped.categories[0]);
  }, [activeCategory, grouped.categories]);

  // Scroll category into view when active changes
  React.useEffect(() => {
    const el = activeCategory ? categoryRefs.current[activeCategory] : null;
    if (el) {
      try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch {}
    }
  }, [activeCategory]);


  // Scroll active tag into view
  React.useEffect(() => {
    if (activeTagIndex == null) return;
    const el = tagItemRefs.current[activeTagIndex];
    if (el) {
      try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch {}
    }
  }, [activeTagIndex]);

  // How many picks sit in each category, so the list shows where they are.
  const pickedByCat = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of allTags) {
      if (!value.includes(t.name)) continue;
      const key = t.category ?? "advanced";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [allTags, value]);

  function toggleTag(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  if (reviewing) return <TagReview value={value} onChange={onChange} onBack={() => setReviewing(false)} height={height} />;

  return (
    <div ref={rootRef} className="grid gap-3">
      {/* Persistent selector */}
      <div className="overflow-hidden rounded-card border border-line-strong bg-surface">
        {/* Search input */}
        <div className="border-b border-line px-1.5 py-2.5">
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
            className="w-full bg-transparent px-2 text-[15px] placeholder:text-text-3 focus:outline-none"
          />
        </div>

        {/* Phones stack the panes: categories become a row of chips above the tag list. */}
        <div className="flex h-[min(24rem,55dvh)] flex-col divide-y divide-line md:h-74 md:flex-row md:divide-x md:divide-y-0">
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
            className="flex-none overflow-x-auto p-2 outline-none md:w-52 md:overflow-auto"
          >
            <div className="mb-1 hidden px-1 text-xs uppercase tracking-wider text-text-3 md:block">Categories</div>
            <div className="flex gap-1.5 md:flex-col md:gap-0">
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
                  className={`${CAT_ROW} ${
                    activeCategory === cat
                      ? (categoriesPaneFocused ? 'bg-surface-2 max-md:border-text-3' : 'bg-surface-2 max-md:border-text-3 md:bg-surface-2/60 md:ring-1 md:ring-line')
                      : 'hover:bg-surface-2'
                  }`}
                >
                  <span className="truncate inline-flex items-center gap-2">
                    {Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}
                    {cat}
                    {newTagsCutoff && categoriesWithNewTags.includes(cat) && (
                      <span className="ml-1 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-3">New</span>
                    )}
                  </span>
                  {pickedByCat.get(cat) ? <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-bold leading-[18px] text-accent-text">{pickedByCat.get(cat)}</span> : null}
                </div>
              );})}
              {filtered.advanced.length > 0 && (
                <div
                  ref={(el) => { categoryRefs.current['advanced'] = el; }}
                  role="option"
                  aria-selected={activeCategory === 'advanced'}
                  onMouseEnter={() => setActiveCategory('advanced')}
                  onClick={() => setActiveCategory('advanced')}
                  className={`${CAT_ROW} md:mt-1 ${
                    activeCategory === 'advanced'
                      ? (categoriesPaneFocused ? 'bg-surface-2 max-md:border-text-3' : 'bg-surface-2 max-md:border-text-3 md:bg-surface-2/60 md:ring-1 md:ring-line')
                      : 'hover:bg-surface-2'
                  }`}
                >
                  <span className="inline-flex items-center gap-2"><MdTune className="h-4 w-4" />Advanced</span>
                  {pickedByCat.get("advanced") ? <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-bold leading-[18px] text-accent-text">{pickedByCat.get("advanced")}</span> : null}
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
            className="min-h-0 flex-1 overflow-auto p-2 outline-none md:min-w-[18rem]"
          >
            <div className="mb-1 px-1 text-xs uppercase tracking-wider text-text-3">{activeCategory === "advanced" ? "Advanced" : (activeCategory || "Pick a category")}</div>
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
                  className={`flex cursor-pointer items-center justify-between rounded-[6px] px-2 py-1.5 text-sm ${activeTagIndex === idx ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
                >
                  <span className="truncate">{t.name}</span>
                  {t.created_at && newTagsCutoff && new Date(t.created_at) > newTagsCutoff && (
                    <span className="ml-auto mr-2 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-3">New</span>
                  )}
                  <input type="checkbox" readOnly tabIndex={-1} checked={value.includes(t.name)} className="h-4 w-4 accent-[var(--rose-deep)]" />
                </div>
              ))}
              {!activeCategory && (
                <div className="px-2 py-1.5 text-sm text-text-3">Select a category</div>
              )}
              {activeCategory && (activeCategory === "advanced" ? filtered.advanced.length === 0 : (filtered.byCat.get(activeCategory)?.length || 0) === 0) && (
                <div className="px-2 py-1.5 text-sm text-text-3">No results</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {loading && <div className="text-xs text-text-3">Loading tags…</div>}
      <div className="flex items-center gap-3 rounded-card bg-surface-2 py-2 pl-3.5 pr-2">
        <div className="min-w-0 flex-1 text-sm">
          <b className="block font-semibold">{value.length === 0 ? "No tags yet" : `${value.length} selected`}</b>
          <span className="block truncate text-xs text-text-3">{value.length ? `On card: ${value.slice(0, 2).join(", ")}` : "The first two you pick show on your card."}</span>
        </div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setHeight(rootRef.current?.offsetHeight);
              setReviewing(true);
            }}
            className={OUTLINE_BTN}
          >
            Review
          </button>
        )}
      </div>
      {done && <div className="mt-1 flex items-center justify-end gap-3">{done}</div>}
    </div>
  );
}

const MENU_ITEM = "block w-full rounded-[6px] px-2.5 py-2 text-left text-sm data-focus:bg-surface-2";

/**
 * Selected tags, split into the two shown on the card and the rest. Tags
 * unchecked here stay listed, crossed out, until the view closes, so rows
 * never jump under a finger and a mis-tap is one tap to undo.
 */
function TagReview({ value, onChange, onBack, height }: { value: string[]; onChange: (next: string[]) => void; onBack: () => void; height?: number }) {
  const [card0, card1] = value;
  // Display order for "Also tagged", including crossed-out rows.
  const [also, setAlso] = React.useState(() => value.slice(2));
  const [flash, setFlash] = React.useState<string | null>(null);
  // Only "Also tagged" scrolls; its bottom fades while more rows sit below.
  const listRef = React.useRef<HTMLUListElement>(null);
  const [more, setMore] = React.useState(false);
  const checkMore = React.useCallback(() => {
    const el = listRef.current;
    setMore(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }, []);
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    checkMore();
    const ro = new ResizeObserver(checkMore);
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkMore, also.length]);

  const commit = (card: (string | undefined)[], nextAlso: string[], keep: (t: string) => boolean) => {
    setAlso(nextAlso);
    onChange([...card.filter((t): t is string => !!t), ...nextAlso.filter(keep)]);
  };
  const listed = (t: string) => value.includes(t);

  function putOnCard(tag: string, slot: 0 | 1) {
    const replaced = value[slot];
    const card = slot === 0 ? [tag, card1] : [card0, tag];
    commit(card, [replaced, ...also.filter((t) => t !== tag)], listed);
    setFlash(replaced);
  }
  function toggle(tag: string) {
    const on = listed(tag);
    commit([card0, card1], also, (t) => (t === tag ? !on : listed(t)));
  }

  return (
    <div className="flex flex-col gap-3" style={{ height }}>
      <section className="flex-none">
        <h3 className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-text-2">
          On your card <span className="font-medium text-text-3">Players see these two first</span>
        </h3>
        <ol className="flex flex-col gap-1.5">
          {[card0, card1].map((tag, i) => (
            <li key={i} className={`flex h-12 items-center gap-2.5 rounded-control border pl-2.5 pr-1.5 text-sm font-medium ${tag ? "border-line-strong" : "border-dashed border-line-strong text-text-3"}`}>
              <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-text">{i + 1}</span>
              <span key={tag} className="anim-pop min-w-0 flex-1 truncate">{tag ?? "Pick another tag to fill this spot"}</span>
              {card0 && card1 && (
                <button type="button" onClick={() => onChange([card1, card0, ...value.slice(2)])} className={QUIET_BTN}>
                  {i === 0 ? (
                    <>
                      Make 2nd <FiArrowDown className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      Make 1st <FiArrowUp className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </li>
          ))}
        </ol>
      </section>

      {also.length > 0 && (
        <section className="flex min-h-0 flex-1 flex-col">
          <h3 className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-text-2">
            Also tagged <span className="font-medium text-text-3">{also.filter(listed).length}</span>
          </h3>
          <ul
            ref={listRef}
            onScroll={checkMore}
            className={`min-h-0 overflow-y-auto overscroll-contain rounded-card border border-line ${more ? "[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)]" : ""}`}
          >
            {also.map((tag) => {
              const on = listed(tag);
              return (
                <li key={tag} className={`flex h-12 items-center gap-2.5 border-t border-line pl-3 pr-1.5 text-sm first:border-t-0 ${tag === flash ? "anim-row-flash" : ""}`}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 self-stretch">
                    <input type="checkbox" checked={on} onChange={() => toggle(tag)} className="h-4 w-4 flex-none accent-[var(--rose-deep)]" />
                    <span className={`truncate ${on ? "" : "text-text-3 line-through"}`}>{tag}</span>
                  </label>
                  {on ? (
                    <Menu>
                      <MenuButton className={OUTLINE_BTN}>Put on card</MenuButton>
                      <MenuItems modal={false} anchor="bottom end" className="anim-pop z-[110] w-52 rounded-card border border-line bg-surface p-1 shadow-overlay [--anchor-gap:4px] focus:outline-none">
                        <p className="px-2.5 pb-0.5 pt-1.5 text-xs text-text-3">Replace which?</p>
                        {([card0, card1] as const).map((c, i) => (
                          <MenuItem key={i}>
                            <button type="button" onClick={() => putOnCard(tag, i as 0 | 1)} className={MENU_ITEM}>
                              <span className="text-text-3">{i + 1} ·</span> {c}
                            </button>
                          </MenuItem>
                        ))}
                      </MenuItems>
                    </Menu>
                  ) : (
                    <span className="px-2.5 text-[13px] text-text-3">Removed</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-none justify-end pt-1">
        <button type="button" onClick={onBack} className="group inline-flex h-10 items-center gap-2 rounded-control bg-surface-2 pl-3.5 pr-[18px] text-sm font-semibold text-text transition-colors hover:bg-line">
          <FiArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" /> Back to all tags
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import type { CatalogTagRow } from "@/types/catalogTag";
import { createClient } from "@/utils/supabase/client";
import { MdTune } from "react-icons/md";
import { CATEGORY_ICONS, getCategoryIcon } from "@/components/Icons/tagCategories";
import { FaTimes } from "react-icons/fa";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragCancelEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { RxDragHandleDots2 } from "react-icons/rx";

type TagRow = CatalogTagRow;

export interface TagSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** When set, skips client Supabase fetch (use server-cached catalog). */
  catalogTags?: CatalogTagRow[];
  newTagsCutoff: Date | null;
}

type CategoryIconType = React.ComponentType<React.SVGProps<SVGSVGElement>> | null;

function SortableSelectedTag({
  id,
  index,
  name,
  categoryIcon: Icon,
  onRemove,
  isPrimary,
  isGhost,
  insertSide,
}: {
  id: string;
  index: number;
  name: string;
  categoryIcon: CategoryIconType;
  onRemove: () => void;
  isPrimary: boolean;
  isGhost: boolean;
  insertSide: "left" | "right" | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    opacity: isGhost ? 0.5 : undefined,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={[
        "relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] sm:text-xs ring-1",
        isPrimary
          ? "bg-[var(--accent-soft,rgba(16,185,129,0.08))] ring-[var(--accent-border,rgba(16,185,129,0.4))]"
          : "bg-[var(--surface-2)] ring-[var(--border)]",
        isDragging && !isGhost ? "opacity-80 shadow-lg shadow-black/20 dark:shadow-black/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {insertSide === "left" && (
        <div className="pointer-events-none absolute -left-1 top-1 bottom-1 w-px bg-[var(--accent,#16a34a)]" />
      )}
      {insertSide === "right" && (
        <div className="pointer-events-none absolute -right-1 top-1 bottom-1 w-px bg-[var(--accent,#16a34a)]" />
      )}
      <button
        type="button"
        className="mr-0.5 inline-flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center rounded-full text-foreground/40 hover:text-foreground/80 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Reorder tag ${name}`}
        {...attributes}
        {...listeners}
      >
        <RxDragHandleDots2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
      </button>
      {Icon ? <Icon className="h-3.5 w-3.5 opacity-80" /> : null}
      <span className="truncate max-w-[9.5rem] sm:max-w-[12rem]">{name}</span>
      {isPrimary && (
        <span className="ml-0.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] sm:text-[8px] uppercase tracking-wide text-foreground/60 dark:bg-white/5">
          {index === 0 ? "First" : "Second"}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 inline-flex h-5 w-5 sm:h-4 sm:w-4 items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
        aria-label={`Remove tag ${name}`}
      >
        <FaTimes className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
      </button>
    </span>
  );
}

function compareTags(a: TagRow, b: TagRow, newTagsCutoff: Date | null): number {
  const aNew = !!(a.created_at && newTagsCutoff && new Date(a.created_at) > newTagsCutoff);
  const bNew = !!(b.created_at && newTagsCutoff && new Date(b.created_at) > newTagsCutoff);
  if (aNew && !bNew) return -1;
  if (!aNew && bNew) return 1;
  return (b.popularity - a.popularity) || a.name.localeCompare(b.name);
}

export default function TagSelector({ value, onChange, catalogTags, newTagsCutoff }: TagSelectorProps) {
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
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

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

  const selectedTagIds = React.useMemo(
    () => value.map((t, i) => `${t}__${i}`),
    [value],
  );

  function toggleTag(name: string) {
    onChange(value.includes(name) ? value.filter((v) => v !== name) : [...value, name]);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    setOverId(id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.over) {
      setOverId(event.over.id as string);
    }
  };

  const handleSelectedDragEnd = (event: DragEndEvent | DragCancelEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      setOverId(null);
      return;
    }
    const oldIndex = selectedTagIds.indexOf(active.id as string);
    const newIndex = selectedTagIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const next = arrayMove(value, oldIndex, newIndex);
    onChange(next);
    setActiveId(null);
    setOverId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  return (
    <div className="grid gap-2">
      {/* Selected tag pills */}
      <div className="text-[11px] text-foreground/60">
        The first two tags appear as badges on your hack card preview.
      </div>
      <div className="flex max-h-24 flex-wrap gap-2 overflow-auto p-1">
        {value.length > 0 ? (
          <DndContext
            id="selected-tags"
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleSelectedDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={selectedTagIds} strategy={rectSortingStrategy}>
              {value.map((t, index) => {
                const cat =
                  grouped.categories.find((c) => (grouped.byCat.get(c) || []).some((r) => r.name === t)) ||
                  (grouped.advanced.some((r) => r.name === t) ? "Advanced" : undefined);
                const Icon = (getCategoryIcon(cat === "Advanced" ? null : cat) ?? null) as CategoryIconType;
                const id = selectedTagIds[index];
                const isPrimary = index === 0 || index === 1;
                const isGhost = activeId === id;
                const overIndex = overId ? selectedTagIds.indexOf(overId) : -1;
                const activeIndex = activeId ? selectedTagIds.indexOf(activeId) : -1;
                let insertSide: "left" | "right" | null = null;
                if (activeId && overIndex === index && activeIndex !== index && activeIndex !== -1) {
                  insertSide = overIndex > activeIndex ? "right" : "left";
                }

                return (
                  <React.Fragment key={id}>
                    <SortableSelectedTag
                      id={id}
                      index={index}
                      name={t}
                      categoryIcon={Icon}
                      onRemove={() => toggleTag(t)}
                      isPrimary={isPrimary}
                      isGhost={isGhost}
                      insertSide={insertSide}
                    />
                  </React.Fragment>
                );
              })}
            </SortableContext>
            <DragOverlay>
              {activeId ? (() => {
                const activeIndex = selectedTagIds.indexOf(activeId);
                if (activeIndex === -1) return null;
                const t = value[activeIndex];
                const cat =
                  grouped.categories.find((c) => (grouped.byCat.get(c) || []).some((r) => r.name === t)) ||
                  (grouped.advanced.some((r) => r.name === t) ? "Advanced" : undefined);
                const Icon = (getCategoryIcon(cat === "Advanced" ? null : cat) ?? null) as CategoryIconType;
                const isPrimary = activeIndex === 0 || activeIndex === 1;
                return (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-[var(--border)] shadow-lg shadow-black/30 dark:shadow-black/60">
                    {Icon ? <Icon className="h-3.5 w-3.5 opacity-80" /> : null}
                    <span className="truncate max-w-[9rem] sm:max-w-[12rem]">{t}</span>
                    {isPrimary && (
                      <span className="ml-0.5 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-foreground/60 dark:bg-white/5">
                        {activeIndex === 0 ? "First" : "Second"}
                      </span>
                    )}
                  </span>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="px-2 py-0.5 text-sm text-foreground/60">No tags selected</div>
        )}
      </div>

      {/* Persistent selector */}
      <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80">
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

        <div className="flex h-74 divide-x divide-[var(--border)]">
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
                  <span className="truncate inline-flex items-center gap-2">
                    {Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}
                    {cat}
                    {newTagsCutoff && categoriesWithNewTags.includes(cat) && (
                      <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-foreground/60 dark:bg-white/5">New</span>
                    )}
                  </span>
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
                  {t.created_at && newTagsCutoff && new Date(t.created_at) > newTagsCutoff && (
                    <span className="ml-auto mr-2 rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-foreground/60 dark:bg-white/5">New</span>
                  )}
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



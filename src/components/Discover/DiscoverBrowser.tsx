"use client";

import React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FiChevronLeft, FiChevronRight, FiGrid, FiLink, FiList, FiSearch, FiSliders, FiX } from "react-icons/fi";
import { MdWhatshot, MdTrendingUp, MdNewReleases, MdUpdate, MdSortByAlpha } from "react-icons/md";
import HackCard, { HackRow } from "@/components/HackCard";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import {
  buildDiscoverSearchParams,
  discoverUrlStatesEqual,
  validateDiscoverTags,
  type DiscoverUrlState,
} from "@/app/discover/search-params";
import type { DiscoverHack, DiscoverSortOption } from "@/types/discover";
import Select, { SelectOption } from "@/components/Primitives/Select";
import { useDiscoverUrlState } from "./useDiscoverUrlState";
import DiscoverLastUpdated from "./DiscoverLastUpdated";
import {
  countActive,
  FilterFields,
  FilterSheet,
  ROM_GAMES,
  useFacetCounts,
  type FilterState,
  type TagGroup,
  EMPTY_FILTERS,
} from "./DiscoverFilters";
import { baseGameLabel, baseRoms } from "@/data/baseRoms";
import { AI_FILTERS, matchesAiFilter, type AiFilter } from "@/utils/aiDisclosure";

const SORT_OPTIONS: SelectOption[] = [
  { value: "trending", label: "Trending", icon: MdWhatshot },
  { value: "popular", label: "Most downloaded", icon: MdTrendingUp },
  { value: "new", label: "Newest", icon: MdNewReleases },
  { value: "updated", label: "Recently updated", icon: MdUpdate },
  { value: "alpha", label: "A–Z", icon: MdSortByAlpha },
];

const HACKS_PER_PAGE = 24;
const VIEW_KEY = "hackdex-discover-view";
type View = "grid" | "list";

interface DiscoverBrowserProps {
  catalog: DiscoverHack[];
  generatedAt: string;
  initialState: DiscoverUrlState;
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
}

/**
 * One predicate for the results and the phone sheet's "Show N hacks", so they can't disagree.
 * Tags are OR within a category and AND across them; "Complete" also matches hacks without a status.
 */
function hackMatcher(f: FilterState, query: string, groups: TagGroup[], readyBaseRomIds: Set<string>) {
  const q = query.toLowerCase();
  const wanted = groups.map((g) => g.tags.filter((t) => f.tags.includes(t))).filter((picked) => picked.length > 0);
  return (h: DiscoverHack) =>
    (!q ||
      h.title.toLowerCase().includes(q) ||
      h.author.toLowerCase().includes(q) ||
      !!h.summary?.toLowerCase().includes(q) ||
      h.tags.some((t) => t.name.toLowerCase().includes(q))) &&
    wanted.every((picked) => picked.some((t) => h.tags.some((tag) => tag.name === t))) &&
    (f.baseRoms.length === 0 || (!!h.baseRomId && f.baseRoms.includes(h.baseRomId))) &&
    (f.completionStatuses.length === 0 || f.completionStatuses.includes(h.completion_status ?? "Complete")) &&
    (!f.onlyReady || (!h.is_archive && !!h.baseRomId && readyBaseRomIds.has(h.baseRomId))) &&
    matchesAiFilter(h.ai, f.ai);
}

export default function DiscoverBrowser({ catalog, generatedAt, initialState, tagGroups, ungroupedTags }: DiscoverBrowserProps) {
  const [query, setQuery] = React.useState(initialState.query);
  const [selectedTags, setSelectedTags] = React.useState<string[]>(() => [...initialState.tags]);
  const [selectedBaseRoms, setSelectedBaseRoms] = React.useState<string[]>(() => [...initialState.baseRoms]);
  const [selectedCompletionStatuses, setSelectedCompletionStatuses] = React.useState<string[]>(() => [...initialState.completionStatuses]);
  const [sort, setSort] = React.useState<DiscoverSortOption>(initialState.sort);
  const [onlyReady, setOnlyReady] = React.useState(initialState.onlyReady);
  const [ai, setAi] = React.useState<AiFilter>(initialState.ai);
  const [currentPage, setCurrentPage] = React.useState(initialState.page);
  const [view, setView] = React.useState<View>("grid");
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_KEY);
      if (stored === "list" || stored === "grid") setView(stored);
    } catch {}
  }, []);
  const changeView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  };

  const { cached, statuses, countReady, loading: baseRomsLoading } = useBaseRoms();
  const readyBaseRomIds = React.useMemo(() => {
    const set = new Set<string>();
    Object.entries(cached || {}).forEach(([id, v]) => {
      if (v) set.add(id);
    });
    Object.entries(statuses || {}).forEach(([id, s]) => {
      if (s === "granted") set.add(id);
    });
    return set;
  }, [cached, statuses]);

  const currentUrlState = React.useMemo<DiscoverUrlState>(
    () => ({
      query,
      sort,
      page: currentPage,
      tags: selectedTags,
      baseRoms: onlyReady ? [] : selectedBaseRoms,
      completionStatuses: selectedCompletionStatuses,
      onlyReady,
      ai,
    }),
    [ai, currentPage, onlyReady, query, selectedBaseRoms, selectedCompletionStatuses, selectedTags, sort]
  );

  const applyUrlState = React.useCallback((nextState: DiscoverUrlState) => {
    setQuery(nextState.query);
    setSelectedTags([...nextState.tags]);
    setSelectedBaseRoms([...nextState.baseRoms]);
    setSelectedCompletionStatuses([...nextState.completionStatuses]);
    setSort(nextState.sort);
    setOnlyReady(nextState.onlyReady);
    setAi(nextState.ai);
    setCurrentPage(nextState.page);
  }, []);

  const { initialUrlStateApplied, syncUrl, syncUrlWith, scheduleSearchUrlSync } = useDiscoverUrlState({
    currentState: currentUrlState,
    onUrlStateChange: applyUrlState,
  });

  const groups = React.useMemo<TagGroup[]>(() => {
    const out = Object.keys(tagGroups)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ name, tags: tagGroups[name] }));
    if (ungroupedTags.length > 0) out.push({ name: "Advanced", tags: ungroupedTags });
    return out;
  }, [tagGroups, ungroupedTags]);

  const validTagNames = React.useMemo(() => new Set(groups.flatMap((g) => g.tags)), [groups]);

  React.useEffect(() => {
    if (!initialUrlStateApplied || selectedTags.length === 0) return;
    const nextState = validateDiscoverTags(currentUrlState, validTagNames);
    if (discoverUrlStatesEqual(nextState, currentUrlState)) return;
    setSelectedTags([...nextState.tags]);
    setCurrentPage(1);
    syncUrl({ ...nextState, page: 1 }, "replace");
  }, [currentUrlState, initialUrlStateApplied, selectedTags.length, syncUrl, validTagNames]);

  const filtered = React.useMemo(() => {
    const matches = hackMatcher({ tags: selectedTags, baseRoms: selectedBaseRoms, completionStatuses: selectedCompletionStatuses, onlyReady, ai }, query, groups, readyBaseRomIds);
    return catalog.filter(matches).sort((a, b) => {
      if (sort === "popular") return b.downloads - a.downloads;
      if (sort === "new") return (b.approvedAt ? Date.parse(b.approvedAt) : 0) - (a.approvedAt ? Date.parse(a.approvedAt) : 0);
      if (sort === "updated") {
        if (!a.publishedAt && !b.publishedAt) return 0;
        if (!a.publishedAt) return 1;
        if (!b.publishedAt) return -1;
        return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      }
      if (sort === "alpha") return a.title.localeCompare(b.title);
      return b.trendingScore - a.trendingScore;
    });
  }, [ai, catalog, groups, onlyReady, query, readyBaseRomIds, selectedBaseRoms, selectedCompletionStatuses, selectedTags, sort]);

  const showSkeleton = !initialUrlStateApplied || (onlyReady && baseRomsLoading);
  const totalPages = Math.max(1, Math.ceil(filtered.length / HACKS_PER_PAGE));

  React.useEffect(() => {
    if (!showSkeleton && currentPage > totalPages) {
      setCurrentPage(totalPages);
      syncUrlWith({ page: totalPages }, "replace");
    }
  }, [currentPage, showSkeleton, syncUrlWith, totalPages]);

  const startIndex = (currentPage - 1) * HACKS_PER_PAGE;
  const endIndex = Math.min(filtered.length, startIndex + HACKS_PER_PAGE);
  const paginated = React.useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);

  const scrollToResults = React.useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ block: "start" }));
  }, []);

  const changePage = React.useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), totalPages);
      if (clamped === currentPage) return;
      setCurrentPage(clamped);
      syncUrlWith({ page: clamped });
      scrollToResults();
    },
    [currentPage, scrollToResults, syncUrlWith, totalPages]
  );

  // ---- filters (rail applies live; the phone sheet edits a draft) ----
  const filterState: FilterState = { tags: selectedTags, baseRoms: selectedBaseRoms, completionStatuses: selectedCompletionStatuses, onlyReady, ai };
  const active = countActive(filterState);
  const counts = useFacetCounts(catalog);
  const readyCount = React.useMemo(
    () => catalog.filter((h) => !h.is_archive && h.baseRomId && readyBaseRomIds.has(h.baseRomId)).length,
    [catalog, readyBaseRomIds]
  );

  const applyFilters = React.useCallback(
    (next: FilterState, mode: "push" | "replace" = "push") => {
      setSelectedTags(next.tags);
      setSelectedBaseRoms(next.baseRoms);
      setSelectedCompletionStatuses(next.completionStatuses);
      setOnlyReady(next.onlyReady);
      setAi(next.ai);
      setCurrentPage(1);
      syncUrlWith({ ...next, baseRoms: next.onlyReady ? [] : next.baseRoms, page: 1 }, mode);
    },
    [syncUrlWith]
  );
  const clearFilters = () => applyFilters(EMPTY_FILTERS);

  const [open, setOpen] = React.useState<Set<string>>(() => new Set(["rom:GBA"]));
  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const [sheet, setSheet] = React.useState(false);
  const [draft, setDraft] = React.useState<FilterState>(filterState);
  const filterBtnRef = React.useRef<HTMLButtonElement>(null);
  const draftTotal = React.useMemo(
    () => (sheet ? catalog.filter(hackMatcher(draft, query, groups, readyBaseRomIds)).length : 0),
    [catalog, draft, groups, query, readyBaseRomIds, sheet]
  );

  const openSheet = () => {
    setDraft(filterState);
    setOpen((s) => {
      const next = new Set(s);
      for (const g of ROM_GAMES) {
        if (!g.ids.some((id) => selectedBaseRoms.includes(id))) continue;
        next.add(`rom:${g.platform}`);
        if (g.dumps.length > 1) next.add(`game:${g.key}`);
      }
      for (const g of groups) if (g.tags.some((t) => selectedTags.includes(t))) next.add(`tag:${g.name}`);
      return next;
    });
    setSheet(true);
  };
  const finishClose = React.useCallback(() => {
    setSheet(false);
    filterBtnRef.current?.focus();
  }, []);
  const closeSheet = (commit: boolean) => {
    const onSheetEntry = Boolean((history.state as { discoverFilters?: boolean } | null)?.discoverFilters);
    if (commit) {
      // Take over the sheet's history entry; pushing on top of it left a duplicate for Back to land on.
      applyFilters(draft, onSheetEntry ? "replace" : "push");
      finishClose();
      return;
    }
    if (onSheetEntry) {
      history.back();
      return;
    }
    finishClose();
  };
  React.useEffect(() => {
    if (!sheet) return;
    history.pushState({ ...(history.state ?? {}), discoverFilters: true }, "");
    window.addEventListener("popstate", finishClose);
    return () => window.removeEventListener("popstate", finishClose);
  }, [sheet, finishClose]);

  const copyDiscoverLink = React.useCallback(async () => {
    const params = buildDiscoverSearchParams({ ...currentUrlState, onlyReady: false }).toString();
    const url = `${window.location.origin}${window.location.pathname}${params ? `?${params}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(params ? "Filtered Discover link copied" : "Discover link copied", { icon: <FiLink className="h-4 w-4" /> });
    } catch {
      toast.error("Unable to copy Discover link");
    }
  }, [currentUrlState]);

  // Applied chips (phone): one per pick, removable in place.
  const chips: { key: string; label: string; ready?: boolean; onRemove: () => void }[] = [];
  if (onlyReady) chips.push({ key: "ready", label: "Ready to patch", ready: true, onRemove: () => applyFilters({ ...filterState, onlyReady: false }) });
  // One chip per dump, so "FireRed (Rev 1)" reads as exactly what is filtered.
  for (const id of selectedBaseRoms) {
    const name = baseRoms.find((r) => r.id === id)?.name ?? id;
    chips.push({ key: `b-${id}`, label: baseGameLabel(name), onRemove: () => applyFilters({ ...filterState, baseRoms: selectedBaseRoms.filter((v) => v !== id) }) });
  }
  for (const c of selectedCompletionStatuses) chips.push({ key: `c-${c}`, label: c, onRemove: () => applyFilters({ ...filterState, completionStatuses: selectedCompletionStatuses.filter((v) => v !== c) }) });
  if (ai !== "any") chips.push({ key: "ai", label: AI_FILTERS.find((f) => f.value === ai)!.label, onRemove: () => applyFilters({ ...filterState, ai: "any" }) });
  for (const t of selectedTags) chips.push({ key: `t-${t}`, label: t, onRemove: () => applyFilters({ ...filterState, tags: selectedTags.filter((v) => v !== t) }) });

  const fields = (mode: "rail" | "sheet") => (
    <FilterFields
      value={mode === "sheet" ? draft : filterState}
      onChange={mode === "sheet" ? setDraft : applyFilters}
      tagGroups={groups}
      counts={counts}
      readyCount={countReady > 0 ? readyCount : 0}
      open={open}
      onToggleOpen={toggleOpen}
      tall={mode === "sheet"}
    />
  );

  const hasFilters = active > 0;
  const pager = totalPages > 1;
  const railRef = useRailHeight();

  return (
    <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden min-w-0 md:block" aria-label="Filters">
        <div className="sticky top-[84px]">
          <div ref={railRef} className="overflow-y-auto overscroll-contain pb-4 pr-3 pt-1 [scrollbar-gutter:stable] [scrollbar-width:thin]">
            <div className="flex h-12 items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">Filters</h2>
              {hasFilters && (
                <button type="button" className="text-link-hd text-[13px]" onClick={clearFilters}>
                  Clear {active}
                </button>
              )}
            </div>
            {fields("rail")}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="relative flex-[1_1_100%] text-text-3 md:flex-1">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);
                setCurrentPage(1);
                scheduleSearchUrlSync({ ...currentUrlState, query: nextQuery, page: 1 });
              }}
              placeholder={`Search ${catalog.length.toLocaleString()} hacks`}
              aria-label="Search hacks"
              className="h-11 w-full rounded-[10px] border border-line-strong bg-surface pl-11 pr-3.5 text-base text-text outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--rose-soft)] md:h-12"
            />
          </form>

          {/* min-w-0: otherwise the unwrapped chip row sets this column's minimum width, stretching the Filters button past the screen. */}
          <div className="flex min-w-0 flex-[1_1_100%] flex-col gap-2.5 md:hidden">
            <button
              ref={filterBtnRef}
              type="button"
              aria-expanded={sheet}
              aria-controls="discover-filter-sheet"
              onClick={openSheet}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-control border bg-surface px-4 font-semibold transition-colors ${sheet ? "border-accent" : "border-line-strong hover:border-text-3"}`}
            >
              <FiSliders className="h-[18px] w-[18px]" />
              Filters
              {hasFilters && <small className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-deep px-1.5 text-xs font-semibold text-white">{active}</small>}
            </button>
            {chips.length > 0 && (
              <div className="-mx-6 flex items-center gap-2 overflow-x-auto px-6 [scrollbar-width:none]" aria-label="Applied filters">
                {chips.map((c) => (
                  <span
                    key={c.key}
                    className={`inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border py-0 pl-3.5 pr-1 text-sm font-medium ${
                      c.ready ? "border-ready bg-ready-soft" : "border-line-strong bg-surface"
                    }`}
                  >
                    {c.ready && <span className="ready-dot" />}
                    {c.label}
                    <button type="button" aria-label={`Remove ${c.label}`} onClick={c.onRemove} className="-mr-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-3 hover:bg-surface-2 hover:text-text">
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
                <button type="button" className="text-link-hd ml-1 flex-none px-2 text-[13px]" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-1 items-center gap-3 md:flex-none">
            <div className="min-w-0 flex-1 md:flex-none">
            <Select
              id="discover-sort"
              value={sort}
              onChange={(value) => {
                const nextSort = value as DiscoverSortOption;
                setSort(nextSort);
                setCurrentPage(1);
                syncUrlWith({ sort: nextSort, page: 1 });
              }}
              options={SORT_OPTIONS}
              dropdownAlign="right"
              className="border-line-strong! bg-surface! pl-3.5! text-[15px]! font-medium hover:border-text-3! md:h-12! md:w-auto! md:min-w-[200px]"
              dropdownClassName="!max-w-[min(90vw,320px)]"
            />
            </div>
            <div role="group" aria-label="View" className="inline-flex h-10 flex-none gap-0.5 rounded-control border border-line-strong bg-surface p-[3px] md:h-12">
              <button
                type="button"
                aria-pressed={view === "grid"}
                aria-label="Grid view"
                onClick={() => changeView("grid")}
                className="inline-flex w-9 items-center justify-center rounded-md text-text-3 transition-colors hover:text-text aria-pressed:bg-surface-2 aria-pressed:text-text md:w-10"
              >
                <FiGrid className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                aria-label="List view"
                onClick={() => changeView("list")}
                className="inline-flex w-9 items-center justify-center rounded-md text-text-3 transition-colors hover:text-text aria-pressed:bg-surface-2 aria-pressed:text-text md:w-10"
              >
                <FiList className="h-[18px] w-[18px]" />
              </button>
            </div>
            <button
              type="button"
              onClick={copyDiscoverLink}
              aria-label="Copy link to current Discover filters"
              title="Copy link to these filters"
              className="hidden h-12 w-12 flex-none items-center justify-center rounded-control border border-line-strong bg-surface text-text-2 transition-colors hover:border-text-3 hover:text-text md:inline-flex"
            >
              <FiLink className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div ref={listRef} className="min-h-[calc(100dvh-160px)] scroll-mt-[76px]">
          {showSkeleton ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fill,minmax(264px,1fr))] md:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <HackCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="my-12 text-center text-text-2">
              <p className="text-lg font-medium text-text">No hacks found</p>
              <p className="mt-1 text-sm">
                {query ? <>No results for &quot;{query}&quot;</> : <>No results</>}
                {hasFilters && <> with the selected filters</>}.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                {query && (
                  <button
                    type="button"
                    className="text-link-hd text-sm"
                    onClick={() => {
                      setQuery("");
                      setCurrentPage(1);
                      syncUrlWith({ query: "", page: 1 });
                    }}
                  >
                    Clear search
                  </button>
                )}
                {hasFilters && (
                  <button type="button" className="text-link-hd text-sm" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>
              <p className="mt-6 text-sm text-text-3">
                Can&apos;t find the hack you want? Try asking the dev to{" "}
                <Link href="/faq#creators" prefetch={false} className="text-link-hd">
                  submit it to Hackdex
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <p className="text-[13px] text-text-2" aria-live="polite">
                  {startIndex + 1}–{endIndex} of {filtered.length.toLocaleString()}
                </p>
                {pager && <Pagination current={currentPage} last={totalPages} onPage={changePage} compact />}
              </div>
              {view === "grid" ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:mt-5 md:grid-cols-[repeat(auto-fill,minmax(264px,1fr))] md:gap-5" aria-label="Hacks">
                  {paginated.map((hack) => (
                    <HackCard key={hack.slug} hack={hack} fill />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2.5" aria-label="Hacks">
                  {paginated.map((hack) => (
                    <HackRow key={hack.slug} hack={hack} />
                  ))}
                </div>
              )}
              {pager && (
                <div className="mb-3 mt-9">
                  <Pagination current={currentPage} last={totalPages} onPage={changePage} />
                </div>
              )}
            </>
          )}
        </div>
        {!showSkeleton && <DiscoverLastUpdated generatedAt={generatedAt} />}
      </div>

      {sheet && (
        <FilterSheet active={countActive(draft)} total={draftTotal} onClose={() => closeSheet(false)} onCommit={() => closeSheet(true)} onClear={() => setDraft(EMPTY_FILTERS)}>
          {fields("sheet")}
        </FilterSheet>
      )}
    </div>
  );
}

/**
 * The desktop rail scrolls on its own, so its height has to stop at the
 * viewport bottom. Until the page has scrolled enough for the rail to stick
 * its top sits below the sticky offset, so a fixed calc() would overshoot.
 */
function useRailHeight() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const fit = () => {
      frame = 0;
      el.style.maxHeight = `${window.innerHeight - el.getBoundingClientRect().top}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    fit();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return ref;
}

/** First, last, current ± `sibling`, with gaps as an ellipsis. */
function pageWindow(current: number, last: number, sibling: number) {
  const nums = new Set<number>([1, last]);
  for (let n = current - sibling; n <= current + sibling; n++) {
    if (n >= 1 && n <= last) nums.add(n);
  }
  const items: Array<number | "gap"> = [];
  for (const n of [...nums].sort((a, b) => a - b)) {
    const prev = items[items.length - 1];
    if (typeof prev === "number" && n - prev > 1) items.push("gap");
    items.push(n);
  }
  return items;
}

/**
 * Numbered pages: Previous hidden on the first page, Next on the last. The
 * wide row shows current ±1; the phone row shows current only so it never wraps.
 */
function Pagination({ current, last, onPage, compact = false }: { current: number; last: number; onPage: (n: number) => void; compact?: boolean }) {
  const size = compact ? "h-[34px] min-w-[34px] text-[13px]" : "h-11 min-w-10 text-sm md:h-9 md:min-w-9";
  const row = (sibling: number) => (
    <>
      {current > 1 && (
        <button type="button" onClick={() => onPage(current - 1)} className={`inline-flex items-center gap-1 rounded-control px-2.5 font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${size}`}>
          <FiChevronLeft className="h-4 w-4" /> {compact ? <span className="sr-only">Previous</span> : "Previous"}
        </button>
      )}
      {pageWindow(current, last, sibling).map((item, i) =>
        item === "gap" ? (
          <span key={`gap-${i}`} className={`inline-flex items-center justify-center text-text-3 ${size}`} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item)}
            aria-current={item === current ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-control px-2 font-medium tabular-nums transition-colors ${size} ${
              item === current ? "bg-accent-deep text-white hover:bg-accent-hover" : "text-text-2 hover:bg-surface-2 hover:text-text"
            }`}
          >
            <span className="sr-only">Page </span>
            {item}
          </button>
        )
      )}
      {current < last && (
        <button type="button" onClick={() => onPage(current + 1)} className={`inline-flex items-center gap-1 rounded-control px-2.5 font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${size}`}>
          {compact ? <span className="sr-only">Next</span> : "Next"} <FiChevronRight className="h-4 w-4" />
        </button>
      )}
    </>
  );
  return (
    <nav aria-label="Pagination" className={compact ? "" : "flex justify-center"}>
      <div className={`items-center justify-center gap-1 ${compact ? "flex" : "hidden md:flex"}`}>{row(compact ? 0 : 1)}</div>
      {!compact && <div className="flex items-center justify-center gap-1 md:hidden">{row(0)}</div>}
    </nav>
  );
}

function HackCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex justify-center bg-well p-3">
        <div className="aspect-[3/2] w-full animate-pulse rounded-frame bg-surface-2 md:w-[240px]" />
      </div>
      <div className="flex flex-col gap-2 px-3.5 pb-3.5 pt-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
        <div className="mt-1 h-3 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-surface-2" />
        <div className="mt-2 flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded-full bg-surface-2" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-surface-2" />
      </div>
    </div>
  );
}

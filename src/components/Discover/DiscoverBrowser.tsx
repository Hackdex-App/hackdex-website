"use client";

import React, { Fragment } from "react";
import Link from "next/link";
import HackCard from "@/components/HackCard";
import { baseRoms } from "@/data/baseRoms";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { useFloating, offset, flip, shift, size, autoUpdate } from "@floating-ui/react";
import { IconType } from "react-icons";
import {
  MdTune,
  MdWhatshot,
  MdTrendingUp,
  MdNewReleases,
  MdUpdate,
  MdSortByAlpha,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { TbProgressCheck } from "react-icons/tb";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { BsSdCardFill } from "react-icons/bs";
import { CATEGORY_ICONS } from "@/components/Icons/tagCategories";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { HackCardAttributes } from "@/components/HackCard";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDiscoverData } from "@/app/discover/actions";
import type { DiscoverSortOption } from "@/types/discover";
import Select, { SelectOption } from "@/components/Primitives/Select";

const SORT_ICON_MAP: Record<DiscoverSortOption, IconType> = {
  trending: MdWhatshot,
  popular: MdTrendingUp,
  new: MdNewReleases,
  updated: MdUpdate,
  alphabetical: MdSortByAlpha,
};

const SORT_OPTIONS: SelectOption[] = [
  { value: "trending", label: "Trending", icon: MdWhatshot },
  { value: "popular", label: "Most popular", icon: MdTrendingUp },
  { value: "new", label: "Newest", icon: MdNewReleases },
  { value: "updated", label: "Recently updated", icon: MdUpdate },
  { value: "alphabetical", label: "Alphabetical", icon: MdSortByAlpha },
];

const HACKS_PER_PAGE = 9;

interface DiscoverBrowserProps {
  initialSort?: DiscoverSortOption;
}

export default function DiscoverBrowser({ initialSort = "trending" }: DiscoverBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedBaseRoms, setSelectedBaseRoms] = React.useState<string[]>([]);
  const [selectedCompletionStatuses, setSelectedCompletionStatuses] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<DiscoverSortOption>(initialSort ?? "trending");
  const [hacks, setHacks] = React.useState<HackCardAttributes[]>([]);
  const [tagGroups, setTagGroups] = React.useState<Record<string, string[]>>({});
  const [ungroupedTags, setUngroupedTags] = React.useState<string[]>([]);
  const [loadingHacks, setLoadingHacks] = React.useState(true);
  const [loadingTags, setLoadingTags] = React.useState(true);
  const [onlyReady, setOnlyReady] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const { cached, statuses, countReady } = useBaseRoms();
  const readyBaseRomIds = React.useMemo(() => {
    const set = new Set<string>();
    try {
      Object.entries(cached || {}).forEach(([id, v]) => {
        if (v) set.add(id);
      });
      Object.entries(statuses || {}).forEach(([id, s]) => {
        if (s === "granted") set.add(id);
      });
    } catch {}
    return set;
  }, [cached, statuses]);

  React.useEffect(() => {
    // Reset to first page when filters or sort change
    setCurrentPage(1);
  }, [query, selectedTags, selectedBaseRoms, selectedCompletionStatuses, onlyReady, sort]);

  React.useEffect(() => {
    const run = async () => {
      setLoadingHacks(true);
      setLoadingTags(true);
      try {
        const result = await getDiscoverData(sort);
        setHacks(result.hacks);
        setTagGroups(result.tagGroups);
        setUngroupedTags(result.ungroupedTags);
      } catch (error) {
        console.error("Failed to fetch hacks:", error);
        setHacks([]);
        setTagGroups({});
        setUngroupedTags([]);
      } finally {
        setLoadingHacks(false);
        setLoadingTags(false);
      }
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
    // AND filter across selected tags: hack must include all selectedTags
    if (selectedTags.length > 0) {
      out = out.filter((h) => selectedTags.every((t) => h.tags.some((tag) => tag.name === t)));
    }
    // OR filter across base roms: hack's baseRomId must be in selectedBaseRoms
    if (selectedBaseRoms.length > 0) {
      out = out.filter((h) => h.baseRomId && selectedBaseRoms.includes(h.baseRomId));
    }
    // OR filter across completion statuses: hack's completion_status must be in selectedCompletionStatuses
    // If "Complete" is selected, also include hacks with null completion_status
    if (selectedCompletionStatuses.length > 0) {
      out = out.filter((h) => {
        if (!h.completion_status) {
          // Include null completion_status if "Complete" is selected
          return selectedCompletionStatuses.includes("Complete");
        }
        return selectedCompletionStatuses.includes(h.completion_status);
      });
    }
    // Filter to hacks whose base ROM is ready (linked with permission or cached)
    if (onlyReady) {
      out = out.filter((h) => !h.is_archive && h.baseRomId && readyBaseRomIds.has(h.baseRomId));
    }
    return out;
  }, [hacks, query, selectedTags, selectedBaseRoms, selectedCompletionStatuses, onlyReady, readyBaseRomIds]);

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(filtered.length / HACKS_PER_PAGE)),
    [filtered.length]
  );

  React.useEffect(() => {
    // Clamp current page if the number of results shrinks
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginationRange = React.useMemo(() => {
    const startIndex = (currentPage - 1) * HACKS_PER_PAGE;
    const endIndex = Math.min(filtered.length, startIndex + HACKS_PER_PAGE);
    return { startIndex, endIndex };
  }, [currentPage, filtered.length]);

  const paginated = React.useMemo(
    () => filtered.slice(paginationRange.startIndex, paginationRange.endIndex),
    [filtered, paginationRange.startIndex, paginationRange.endIndex]
  );

  const scrollToListTopOnMobile = React.useCallback(() => {
    if (typeof window === "undefined" || !listRef.current) return;
    // Only auto-scroll on small screens so desktop users aren't jolted
    if (window.innerWidth < 640) {
      const rect = listRef.current.getBoundingClientRect();
      const headerOffset = 72; // approximate navbar  with padding
      const targetY = Math.max(0, rect.top + window.scrollY - headerOffset);
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }
  }, []);

  const changePage = React.useCallback(
    (nextPage: number) => {
      setCurrentPage((prev) => {
        const clamped = Math.min(Math.max(1, nextPage), totalPages);
        // Only scroll when the page actually changes
        if (clamped !== prev) {
          // Defer scroll until after React has applied the state update
          setTimeout(scrollToListTopOnMobile, 0);
        }
        return clamped;
      });
    },
    [scrollToListTopOnMobile, totalPages]
  );

  const getPageNumbers = React.useCallback((current: number, total: number): (number | string)[] => {
    // If 7 or fewer pages, show all
    if (total <= 6) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    if (current <= 3) {
      // Near the start: show 1, 2, 3, 4, ..., last
      for (let i = 2; i <= 4; i++) {
        pages.push(i);
      }
      pages.push("ellipsis");
      pages.push(total);
    } else if (current >= total - 2) {
      // Near the end: show 1, ..., total-3, total-2, total-1, total
      pages.push("ellipsis");
      for (let i = total - 3; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // In the middle: show 1, ..., current-1, current, current+1, ..., last
      pages.push("ellipsis");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("ellipsis");
      pages.push(total);
    }

    return pages;
  }, []);

  function toggleTag(name: string) {
    setSelectedTags((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  }

  function clearTags() {
    setSelectedTags([]);
  }

  function toggleBaseRom(id: string) {
    setSelectedBaseRoms((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function clearBaseRoms() {
    setSelectedBaseRoms([]);
  }

  const sortIcon = React.useMemo(() => {
    const SortIcon = SORT_ICON_MAP[sort];
    return SortIcon ? <SortIcon className="h-5 w-5 text-foreground/80" aria-hidden="true" /> : null;
  }, [sort]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or keyword"
            className="h-11 w-full rounded-md bg-[var(--surface-2)] px-3 text-sm text-foreground placeholder:text-foreground/60 ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div className="flex h-11 w-full items-center gap-1.5 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] sm:inline-flex sm:w-auto">
          {sortIcon}
          <div className="relative flex-1 sm:flex-none">
            <Select
              value={sort}
              onChange={(value) => {
                const nextSort = value as DiscoverSortOption;
                setSort(nextSort);
                const current = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
                current.set("sort", nextSort);
                const queryString = current.toString();
                const url = queryString ? `${pathname}?${queryString}` : pathname;
                router.replace(url);
              }}
              options={SORT_OPTIONS}
              // this css gets a little janky, but it gets the job done
              className="flex h-11 w-full items-center rounded-none bg-transparent px-0 pl-1 pr-8 text-left sm:w-fit !ring-0 focus:ring-0"
              dropdownClassName="-left-[2.313rem] top-[44px] !min-w-0 !max-w-none !w-[calc(100%_+_3.125rem)] sm:left-auto sm:right-[-12px] sm:!w-max"
            />
          </div>
        </div>
      </div>

      {/* Unified filter section: Base ROM dropdown first, category dropdowns next, ungrouped tags last */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {countReady > 0 && (
          <button
            type="button"
            aria-pressed={onlyReady}
            onClick={() =>
              setOnlyReady((v) => {
                const next = !v;
                if (next) setSelectedBaseRoms([]);
                return next;
              })
            }
            title="Show only hacks playable on your device (base ROM ready)"
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors ${
              onlyReady
                ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35"
                : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
            <span className="truncate">Ready on your device</span>
            <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-xs leading-none text-foreground/70 dark:bg-white/10">{countReady}</span>
          </button>
        )}
        <MultiSelectDropdown
          icon={BsSdCardFill}
          label="Base ROM"
          options={baseRoms.map((b) => ({ id: b.id, name: b.name }))}
          values={selectedBaseRoms}
          onChange={(vals) => {
            setSelectedBaseRoms(vals);
            if (vals.length > 0) setOnlyReady(false);
          }}
        />
        <MultiSelectDropdown
          icon={TbProgressCheck}
          label="Completion"
          options={['Complete','Demo','Alpha','Beta'].map((s) => ({ id: s, name: s }))}
          values={selectedCompletionStatuses}
          onChange={setSelectedCompletionStatuses}
        />
        {loadingTags ? (
          <>
            {[
              "w-28","w-36","w-32","w-24","w-24","w-28","w-36","w-36"
            ].map((w, i) => (
              <div key={i} className={`h-8 ${w} animate-pulse rounded-full bg-[var(--surface-2)]`} />
            ))}
          </>
        ) : (
          <>
            {Object.keys(tagGroups)
              .sort((a, b) => a.localeCompare(b))
              .map((cat) => (
                <MultiSelectDropdown
                  key={cat}
                  icon={CATEGORY_ICONS[cat]}
                  label={cat}
                  options={tagGroups[cat].map((t) => ({ id: t, name: t }))}
                  values={selectedTags.filter((t) => tagGroups[cat].includes(t))}
                  onChange={(vals) => {
                    // Replace selections for this category while keeping others
                    setSelectedTags((prev) => {
                      const others = prev.filter((t) => !tagGroups[cat].includes(t));
                      return [...others, ...vals];
                    });
                  }}
                />
              ))}
            {/* Advanced dropdown for ungrouped tags at the end */}
            {ungroupedTags.length > 0 && (
              <MultiSelectDropdown
                icon={MdTune}
                label="Advanced"
                options={ungroupedTags.map((t) => ({ id: t, name: t }))}
                values={selectedTags.filter((t) => ungroupedTags.includes(t))}
                onChange={(vals) => {
                  setSelectedTags((prev) => {
                    const others = prev.filter((t) => !ungroupedTags.includes(t));
                    return [...others, ...vals];
                  });
                }}
              />
            )}
          </>
        )}
        {(selectedTags.length > 0 || selectedBaseRoms.length > 0 || selectedCompletionStatuses.length > 0 || onlyReady) && (
          <button
            onClick={() => {
              clearTags();
              clearBaseRoms();
              setSelectedCompletionStatuses([]);
              setOnlyReady(false);
            }}
            className="ml-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          >
            Clear filters
          </button>
        )}
      </div>

      {loadingHacks ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <HackCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-8 text-center">
          <div className="mb-2 text-lg font-medium text-foreground">No hacks found</div>
          <p className="mb-4 text-sm text-foreground/70">
            {query ? (
              <>
                No results for &quot;{query}&quot;
              </>
            ) : (
              <>No results</>
            )}
            {(selectedTags.length > 0 || selectedBaseRoms.length > 0 || selectedCompletionStatuses.length > 0) && (
              <>
                {" "}with the selected filters
              </>
            )}.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Clear search
              </button>
            )}
            {(selectedTags.length > 0 || selectedBaseRoms.length > 0 || selectedCompletionStatuses.length > 0 || onlyReady) && (
              <button
                onClick={() => {
                  clearTags();
                  clearBaseRoms();
                  setSelectedCompletionStatuses([]);
                  setOnlyReady(false);
                }}
                className="rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Clear filters
              </button>
            )}
          </div>
          <p className="mt-4 text-sm text-foreground/60 text-center">Can't find the hack you want? Try asking the dev to <Link href="/faq#creators" className="text-[var(--accent)] hover:underline">submit it to Hackdex</Link>.</p>
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {paginated.map((hack) => (
              <HackCard key={hack.slug} hack={hack} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="text-xs text-foreground/70 text-center">
                Showing {paginationRange.startIndex + 1}-{paginationRange.endIndex} of {filtered.length} hacks
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2 w-full">
                {/* Mobile: Previous/Next buttons row, Desktop: unwraps with contents */}
                <div className="order-1 sm:contents flex items-center justify-center gap-3 sm:gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`h-11 sm:h-9 rounded-full px-3 text-sm ring-1 ring-inset transition-colors flex-1 sm:flex-none max-w-[120px] sm:max-w-none min-w-0 sm:min-w-[90px] flex items-center justify-center ${
                      currentPage === 1
                        ? "cursor-not-allowed bg-[var(--surface-2)] text-foreground/40 ring-[var(--border)]"
                        : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] active:bg-black/10 dark:active:bg-white/15 sm:hover:bg-black/5 sm:dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="sm:hidden">
                      <MdChevronLeft className="h-6 w-6" />
                    </span>
                    <span className="hidden sm:inline">Previous</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`sm:order-3 h-11 sm:h-9 rounded-full px-3 text-sm ring-1 ring-inset transition-colors flex-1 sm:flex-none max-w-[120px] sm:max-w-none min-w-0 sm:min-w-[90px] flex items-center justify-center ${
                      currentPage === totalPages
                        ? "cursor-not-allowed bg-[var(--surface-2)] text-foreground/40 ring-[var(--border)]"
                        : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] active:bg-black/10 dark:active:bg-white/15 sm:hover:bg-black/5 sm:dark:hover:bg-white/10"
                    }`}
                  >
                    <span className="sm:hidden">
                      <MdChevronRight className="h-6 w-6" />
                    </span>
                    <span className="hidden sm:inline">Next</span>
                  </button>
                </div>
                {/* Page numbers - order-2 on mobile (below buttons), order-2 on desktop (between Previous and Next) */}
                <div className="order-2 flex items-center justify-center gap-1.5 sm:gap-1 flex-wrap">
                  {getPageNumbers(currentPage, totalPages).map((item, i) => {
                    if (item === "ellipsis") {
                      return (
                        <span
                          key={`ellipsis-${i}`}
                          className="h-10 sm:h-8 min-w-6 sm:min-w-5 flex items-center justify-center text-sm sm:text-xs text-foreground/50"
                          aria-hidden="true"
                        >
                          <IoEllipsisHorizontal className="h-5 w-5 sm:h-4 sm:w-4" />
                        </span>
                      );
                    }
                    const page = item as number;
                    const isActive = page === currentPage;
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => changePage(page)}
                        className={`h-10 sm:h-8 min-w-10 sm:min-w-8 rounded-full px-2 text-sm sm:text-xs ring-1 ring-inset transition-colors flex items-center justify-center ${
                          isActive
                            ? "bg-[var(--accent)] text-[var(--foreground)] font-bold ring-[var(--accent)]/60"
                            : "bg-[var(--surface-2)] text-foreground/70 font-medium ring-[var(--border)] active:bg-black/10 dark:active:bg-white/15 sm:hover:bg-black/5 sm:dark:hover:bg-white/10"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface MultiSelectOption {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  icon?: IconType;
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
}

function MultiSelectDropdown({
  icon: Icon,
  label,
  options,
  values,
  onChange,
}: MultiSelectDropdownProps) {
  const { refs, floatingStyles, update } = useFloating({
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(availableWidth, 420)}px`,
          });
        },
      }),
    ],
  });
  React.useEffect(() => {
    const reference = refs.reference.current;
    const floating = refs.floating.current;
    if (!reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [refs.reference, refs.floating, update]);
  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [options]);
  const selectedNames = values.map((v) => nameById.get(v) || v);
  const hasSelection = values.length > 0;
  return (
    <Listbox value={values} onChange={onChange} multiple>
      <div className="relative">
        <ListboxButton
          ref={refs.setReference}
          className={`flex max-w-[22rem] cursor-pointer select-none items-center gap-2 truncate rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors ${
            hasSelection
              ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35"
              : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          } data-open:ring-2 data-open:ring-[var(--ring)]`}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
          <span className="truncate">
            {selectedNames.length > 0 ? `${label}: ${selectedNames.join(", ")}` : label}
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions ref={refs.setFloating} style={floatingStyles} className="z-50 max-h-64 min-w-[14rem] overflow-auto rounded-md border border-[var(--border)] bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl p-1 shadow-lg focus:outline-none">
            {options.map((opt) => (
              <ListboxOption
                key={opt.id}
                value={opt.id}
                className={({ active }) =>
                  `cursor-pointer select-none rounded px-2 py-1 text-sm ${active ? "bg-black/5 dark:bg-white/10" : ""}`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={selected} className="h-4 w-4 accent-[var(--accent)]" />
                    <span className="text-foreground/90">{opt.name}</span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}


function HackCardSkeleton() {
  return (
    <div className="group block">
      <div className="rounded-[12px] overflow-hidden card ring-1 ring-[var(--border)]">
        <div className="relative aspect-[3/2] w-full rounded-[12px] overflow-hidden bg-[var(--surface-2)]">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-black/5 to-black/0 dark:from-white/5 dark:to-white/0" />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-4 w-12 shrink-0 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="mt-3 h-3 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}



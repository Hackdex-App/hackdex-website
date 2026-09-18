"use client";

import React from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import { baseRoms, PLATFORM_NAMES, type Platform } from "@/data/baseRoms";

/** Rail order: the platforms with the most hacks first. */
const RAIL_PLATFORMS: Platform[] = ["GBA", "GBC", "GB", "NDS"];
import { DISCOVER_COMPLETION_STATUSES } from "@/app/discover/search-params";
import type { DiscoverHack } from "@/types/discover";

/** The filterable part of the Discover URL state. The sheet edits a draft copy of this. */
export type FilterState = {
  tags: string[];
  baseRoms: string[];
  completionStatuses: string[];
  onlyReady: boolean;
};

export type TagGroup = { name: string; tags: string[] };

/** Base ROM label for filters: "FireRed" rather than "Pokémon FireRed (Rev 0)". */
export function baseGameLabel(name: string) {
  return name.replace(/^Pokémon\s+/i, "").replace(/\s*\(Rev \d+\)\s*$/i, "");
}

/** Unique games from the ROM list. Revisions collapse to one row that toggles all of their ids together. */
export const ROM_GAMES = (() => {
  const byKey = new Map<string, { label: string; platform: Platform; ids: string[] }>();
  for (const rom of baseRoms) {
    if (/\((FR|DE|JP)\)/.test(rom.name)) continue;
    const label = baseGameLabel(rom.name);
    const key = `${rom.platform}:${label}`;
    const game = byKey.get(key) ?? { label, platform: rom.platform, ids: [] };
    game.ids.push(rom.id);
    byKey.set(key, game);
  }
  return [...byKey.values()];
})();

export function countActive(f: FilterState) {
  return f.tags.length + f.baseRoms.length + f.completionStatuses.length + (f.onlyReady ? 1 : 0);
}

export function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Catalog-wide counts so a filter's number tells you what it will do before you tap it. */
export function useFacetCounts(catalog: DiscoverHack[]) {
  return React.useMemo(() => {
    const byBase = new Map<string, number>();
    const byCompletion = new Map<string, number>();
    const byTag = new Map<string, number>();
    for (const h of catalog) {
      if (h.baseRomId) byBase.set(h.baseRomId, (byBase.get(h.baseRomId) ?? 0) + 1);
      const c = h.completion_status ?? "Complete";
      byCompletion.set(c, (byCompletion.get(c) ?? 0) + 1);
      for (const t of h.tags) byTag.set(t.name, (byTag.get(t.name) ?? 0) + 1);
    }
    return {
      base: (ids: string[]) => ids.reduce((n, id) => n + (byBase.get(id) ?? 0), 0),
      completion: (c: string) => byCompletion.get(c) ?? 0,
      tag: (t: string) => byTag.get(t) ?? 0,
    };
  }, [catalog]);
}

interface FieldsProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  tagGroups: TagGroup[];
  counts: ReturnType<typeof useFacetCounts>;
  readyCount: number;
  /** Groups whose disclosure is open; the sheet starts with everything closed except groups that already have a pick. */
  open: Set<string>;
  onToggleOpen: (id: string) => void;
  tall?: boolean;
}

/** The rail body. Shared by the desktop rail (live) and the phone sheet (draft). */
export function FilterFields({ value, onChange, tagGroups, counts, readyCount, open, onToggleOpen, tall }: FieldsProps) {
  const [romQ, setRomQ] = React.useState("");
  const [tagQ, setTagQ] = React.useState("");
  const romQuery = romQ.trim().toLowerCase();
  const tagQuery = tagQ.trim().toLowerCase();
  const rowH = tall ? "min-h-11" : "min-h-8";

  const toggleGame = (ids: string[]) => {
    const has = ids.some((id) => value.baseRoms.includes(id));
    const baseRomsNext = has ? value.baseRoms.filter((id) => !ids.includes(id)) : [...value.baseRoms, ...ids];
    onChange({ ...value, baseRoms: baseRomsNext, onlyReady: baseRomsNext.length > 0 ? false : value.onlyReady });
  };

  const visibleGames = ROM_GAMES.filter((g) => !romQuery || g.label.toLowerCase().includes(romQuery));
  const visibleGroups = tagGroups
    .map((g) => ({ ...g, tags: g.tags.filter((t) => !tagQuery || t.toLowerCase().includes(tagQuery)) }))
    .filter((g) => g.tags.length > 0);

  return (
    <>
      {readyCount > 0 && (
        <Check
          className={`-mx-2 mb-2 px-2 py-1.5 font-medium ${rowH}`}
          ready
          checked={value.onlyReady}
          onChange={() => onChange({ ...value, onlyReady: !value.onlyReady, baseRoms: value.onlyReady ? value.baseRoms : [] })}
          label={
            <span className="inline-flex items-center gap-2">
              <span className="ready-dot" /> Ready to patch
            </span>
          }
          count={readyCount}
        />
      )}

      <Group title="Base ROM">
        <Find value={romQ} onChange={setRomQ} placeholder="Find a base ROM" />
        {RAIL_PLATFORMS.map((platform) => {
          const games = visibleGames.filter((g) => g.platform === platform);
          if (games.length === 0) return null;
          const id = `rom:${platform}`;
          const picked = games.filter((g) => g.ids.some((i) => value.baseRoms.includes(i))).length;
          return (
            <Disclosure
              key={id}
              id={id}
              label={PLATFORM_NAMES[platform]}
              count={picked || games.length}
              picked={picked > 0}
              expanded={open.has(id) || romQuery.length > 0}
              onToggle={() => onToggleOpen(id)}
              tall={tall}
            >
              {games.map((g) => (
                <Check
                  key={g.label}
                  className={rowH}
                  label={g.label}
                  count={counts.base(g.ids)}
                  checked={g.ids.some((i) => value.baseRoms.includes(i))}
                  onChange={() => toggleGame(g.ids)}
                />
              ))}
            </Disclosure>
          );
        })}
        {romQuery && visibleGames.length === 0 && <p className="mt-2 text-[13px] text-text-3">No base ROMs match.</p>}
      </Group>

      <Group title="Completion">
        {DISCOVER_COMPLETION_STATUSES.map((c) => (
          <Check
            key={c}
            className={rowH}
            label={c}
            count={counts.completion(c)}
            checked={value.completionStatuses.includes(c)}
            onChange={() => onChange({ ...value, completionStatuses: toggleValue(value.completionStatuses, c) })}
          />
        ))}
      </Group>

      <Group title="Tags">
        <Find value={tagQ} onChange={setTagQ} placeholder="Find a tag" />
        {visibleGroups.map((group) => {
          const id = `tag:${group.name}`;
          const picked = group.tags.filter((t) => value.tags.includes(t)).length;
          return (
            <Disclosure
              key={id}
              id={id}
              label={group.name}
              count={picked || group.tags.length}
              picked={picked > 0}
              expanded={open.has(id) || tagQuery.length > 0}
              onToggle={() => onToggleOpen(id)}
              tall={tall}
            >
              {group.tags.map((t) => (
                <Check
                  key={t}
                  className={rowH}
                  label={t}
                  count={counts.tag(t)}
                  checked={value.tags.includes(t)}
                  onChange={() => onChange({ ...value, tags: toggleValue(value.tags, t) })}
                />
              ))}
            </Disclosure>
          );
        })}
        {tagQuery && visibleGroups.length === 0 && <p className="mt-2 text-[13px] text-text-3">No tags match.</p>}
      </Group>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-4 first-of-type:border-t-0">
      <h3 className="mb-2 text-[13px] font-semibold text-text-3">{title}</h3>
      {children}
    </section>
  );
}

function Find({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative mb-2 block text-text-3">
      <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-[34px] w-full rounded-control border border-line-strong bg-surface pl-8 pr-2.5 text-[13px] text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent"
      />
    </label>
  );
}

function Disclosure({ id, label, count, picked, expanded, onToggle, tall, children }: { id: string; label: string; count: number; picked: boolean; expanded: boolean; onToggle: () => void; tall?: boolean; children: React.ReactNode }) {
  return (
    <div className="[&+&]:mt-0.5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={onToggle}
        className={`flex w-full items-center gap-1.5 rounded-md px-0.5 text-left text-[13px] font-semibold text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${tall ? "min-h-11" : "min-h-8"}`}
      >
        <FiChevronDown className={`h-4 w-4 flex-none text-text-3 transition-transform duration-[160ms] ${expanded ? "-rotate-180" : ""}`} />
        {label}
        <small className="ml-auto text-xs font-medium text-text-3">{picked ? `${count} selected` : count}</small>
      </button>
      {expanded && (
        <div id={id} className="pb-2 pl-0.5 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

function Check({ label, count, checked, onChange, className = "", ready = false }: { label: React.ReactNode; count: number; checked: boolean; onChange: () => void; className?: string; ready?: boolean }) {
  return (
    <label className={`group/check flex cursor-pointer select-none items-center gap-2.5 rounded-md text-sm ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={`relative h-[18px] w-[18px] flex-none rounded-[5px] border-[1.5px] border-line-strong bg-surface transition-colors duration-[120ms] group-hover/check:border-text-3 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-[5px] after:top-[1.5px] after:h-[9px] after:w-[5px] after:rotate-45 after:scale-[.6] after:border-b-2 after:border-r-2 after:border-white after:opacity-0 after:transition-[transform,opacity] after:duration-[120ms] after:content-[''] peer-checked:after:scale-100 peer-checked:after:opacity-100 ${
          ready ? "peer-checked:border-ready peer-checked:bg-ready" : "peer-checked:border-accent-deep peer-checked:bg-accent-deep"
        }`}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <small className="text-xs tabular-nums text-text-3">{count}</small>
    </label>
  );
}

interface SheetProps {
  active: number;
  total: number;
  onClose: () => void;
  onCommit: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

/**
 * Phone filter sheet. Taps edit a draft; the footer commits it. Close, scrim,
 * Escape, and history Back discard. 90% tall so the whole rail fits.
 */
export function FilterSheet({ active, total, onClose, onCommit, onClear, children }: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  const [mounted, setMounted] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    // Paint at the final height first, then slide in, so the panel never travels as a tall content box.
    const enter = requestAnimationFrame(() => requestAnimationFrame(() => setInView(true)));
    panelRef.current?.focus({ preventScroll: true });
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, [href], select, textarea")].filter((el) => !el.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(enter);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;
  const show = total === 1 ? "Show 1 hack" : `Show ${total.toLocaleString()} hacks`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden md:hidden" role="presentation">
      <button type="button" className="absolute inset-0 bg-[rgba(13,16,23,.4)] anim-fade" aria-label="Dismiss filters" onClick={onClose} />
      <div
        ref={panelRef}
        id="discover-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discover-filter-title"
        tabIndex={-1}
        className={`relative flex h-[90%] max-h-[90%] min-h-0 flex-none flex-col overflow-hidden rounded-t-[20px] bg-surface text-text shadow-overlay outline-none transition-transform duration-[240ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
          inView ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-none justify-center pb-1 pt-2.5" aria-hidden>
          <span className="h-1 w-8 rounded-full bg-line-strong" />
        </div>
        <div className="grid flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line px-3 pb-2.5">
          {active > 0 ? (
            <button type="button" className="text-link-hd justify-self-start text-sm" onClick={onClear}>
              Clear {active}
            </button>
          ) : (
            <span />
          )}
          <h2 id="discover-filter-title" className="text-center text-[17px] font-semibold">
            Filters
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1">{children}</div>
        <div className="flex-none border-t border-line bg-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
          {total === 0 && <p className="mb-2 text-center text-[13px] text-text-3">No hacks match. Clear filters.</p>}
          <button
            type="button"
            onClick={onCommit}
            disabled={total === 0}
            className="h-12 w-full rounded-control bg-accent-deep text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-surface-2 disabled:text-text-3"
          >
            {show}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

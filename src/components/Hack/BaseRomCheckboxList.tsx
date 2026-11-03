"use client";

import React from "react";
import { baseRoms, type Platform } from "@/data/baseRoms";

/** Checkbox list of one platform's base ROMs, grouped by game family. Used to pick a multi-source hack's ROMs. */
export default function BaseRomCheckboxList({
  platform,
  value,
  onChange,
  disabled = false,
  max,
}: {
  platform: Platform | "";
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const grouped = React.useMemo(() => {
    const groups: { category: string; roms: typeof baseRoms }[] = [];
    let currentCategory: string | null = null;
    for (const rom of baseRoms) {
      if (!platform || rom.platform !== platform) continue;
      const category = rom.category || "";
      if (category !== currentCategory) {
        currentCategory = category;
        groups.push({ category, roms: [] });
      }
      groups[groups.length - 1].roms.push(rom);
    }
    return groups;
  }, [platform]);

  function toggle(id: string) {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    if (max != null && value.length >= max) return;
    onChange([...value, id]);
  }

  if (!platform) {
    return <div className="rounded-control bg-surface-2 px-3 py-3 text-sm text-text-3">Choose a base ROM first; the others must be for the same platform.</div>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto overscroll-contain rounded-control border border-line-strong bg-surface p-3">
      {grouped.map((group) => (
        <div key={group.category || "other"} className="flex flex-col gap-1">
          {group.category && <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-text-3">{group.category}</div>}
          {group.roms.map((rom) => {
            const checked = value.includes(rom.id);
            const itemDisabled = disabled || (max != null && !checked && value.length >= max);
            return (
              <label
                key={rom.id}
                className={`flex min-h-[32px] items-center gap-2.5 rounded-md px-1.5 py-1 text-sm ${itemDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-surface-2"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={itemDisabled}
                  onChange={() => toggle(rom.id)}
                  className="h-4 w-4 flex-none accent-[var(--rose-deep)]"
                />
                <span className="min-w-0">
                  <span className="font-medium">{rom.name.replace(/^Pokémon\s+/, "")}</span>
                  <span className="ml-1.5 text-xs text-text-3">{rom.region}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

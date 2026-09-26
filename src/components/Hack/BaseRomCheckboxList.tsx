"use client";

import React from "react";
import { baseRoms, type Platform } from "@/data/baseRoms";

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
    let currentCategory = "";
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
    return (
      <div className="rounded-md bg-[var(--surface-2)] px-3 py-3 text-sm text-foreground/60 ring-1 ring-inset ring-[var(--border)]">
        Select a platform first
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-md bg-[var(--surface-2)] p-3 ring-1 ring-inset ring-[var(--border)]">
      {grouped.map((group) => (
        <div key={group.category || "uncategorized"} className="grid gap-2">
          {group.category && (
            <div className="text-[11px] font-semibold uppercase tracking-wide text-foreground/55">
              {group.category}
            </div>
          )}
          <div className="grid gap-1.5">
            {group.roms.map((rom) => {
              const checked = value.includes(rom.id);
              const atMax = max != null && !checked && value.length >= max;
              const itemDisabled = disabled || atMax;
              return (
                <label
                  key={rom.id}
                  className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${
                    itemDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={itemDisabled}
                    onChange={() => toggle(rom.id)}
                    className="mt-0.5 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>
                    <span className="font-medium">{rom.name.replace("Pokémon ", "")}</span>
                    <span className="ml-1 text-xs text-foreground/55">({rom.region})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

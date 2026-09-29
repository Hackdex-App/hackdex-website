"use client";

import { baseRomName, formatBaseRomNames, uniqueBaseRomIds } from "@/utils/hacks/base-roms";

export default function BaseRomNamesLabel({
  ids,
  prefix,
}: {
  ids: string[];
  prefix?: string;
}) {
  const uniqueIds = uniqueBaseRomIds(ids);
  const label = formatBaseRomNames(uniqueIds);
  const showTooltip = uniqueIds.length > 2;

  if (!showTooltip) {
    return <>{prefix}{label}</>;
  }

  return (
    <span className="relative inline-flex group/base-roms">
      {prefix}
      <span
        tabIndex={0}
        className="cursor-help underline decoration-dotted decoration-foreground/40 underline-offset-2"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-max max-w-64 rounded-md bg-[var(--surface-2)] px-2.5 py-1.5 text-left text-xs leading-5 text-foreground shadow-lg ring-1 ring-[var(--border)] group-hover/base-roms:block group-focus-within/base-roms:block"
      >
        {uniqueIds.map((id) => (
          <span key={id} className="block">
            {baseRomName(id)}
          </span>
        ))}
      </span>
    </span>
  );
}

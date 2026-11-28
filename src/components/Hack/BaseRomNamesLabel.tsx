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
        className="cursor-help underline decoration-dotted decoration-text-3 underline-offset-2"
      >
        {label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-max max-w-64 rounded-control border border-line bg-surface px-2.5 py-1.5 text-left text-xs leading-5 text-text shadow-overlay group-hover/base-roms:block group-focus-within/base-roms:block"
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

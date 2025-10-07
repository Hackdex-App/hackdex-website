"use client";

import { useBaseRoms } from "@/contexts/BaseRomContext";

export default function BaseRomReadyCount() {
  const { countReady } = useBaseRoms();
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-600/60 text-white ring-emerald-700/80 px-2 py-0.5 text-base align-text-top dark:bg-emerald-500/20 dark:text-emerald-300 ring-1 dark:ring-emerald-400/30">{countReady}</span>
  );
}



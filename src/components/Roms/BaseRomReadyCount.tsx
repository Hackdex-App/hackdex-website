"use client";

import { useBaseRoms } from "@/contexts/BaseRomContext";

export default function BaseRomReadyCount() {
  const { countReady } = useBaseRoms();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ready-soft px-2.5 py-0.5 text-[13px] font-semibold tracking-normal text-text [font-stretch:100%]"><span className="ready-dot" />{countReady} ready</span>
  );
}



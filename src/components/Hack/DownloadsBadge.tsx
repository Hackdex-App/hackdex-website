"use client";

import React from "react";
import { FaDownload } from "react-icons/fa6";
import { formatCompactNumber } from "@/utils/format";
import type { DownloadEvent } from "@/types/util";

export default function DownloadsBadge({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = React.useState<number>(initialCount);
  const [anim, setAnim] = React.useState<boolean>(false);

  React.useEffect(() => {
    function onApplied(e: Event) {
      const detail = (e as DownloadEvent).detail;
      if (detail.slug !== slug) return;
      setCount((c) => c + 1);
      setAnim(true);
      const t = setTimeout(() => setAnim(false), 600);
      return () => clearTimeout(t);
    }
    window.addEventListener("hack:patch-applied", onApplied);
    return () => window.removeEventListener("hack:patch-applied", onApplied);
  }, [slug]);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full ring-1 ring-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm text-foreground/85 transition-transform ${
        anim ? "scale-110 shadow-md font-bold" : ""
      }`}
    >
      <FaDownload size={16} className="text-foreground/85" />
      <span>{formatCompactNumber(count)}</span>
    </div>
  );
}



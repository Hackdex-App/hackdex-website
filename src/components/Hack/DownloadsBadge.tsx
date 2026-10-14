"use client";

import React from "react";
import { FiDownload } from "react-icons/fi";
import { formatCompactNumber } from "@/utils/format";
import type { DownloadEvent } from "@/types/util";

/** Download count that ticks up (with a small pop) when this page's patch is applied. */
export default function DownloadsBadge({ slug, initialCount }: { slug: string; initialCount: number }) {
  const [count, setCount] = React.useState<number>(initialCount);
  const [anim, setAnim] = React.useState<boolean>(false);

  React.useEffect(() => {
    let t: number | undefined;
    function onApplied(e: Event) {
      const detail = (e as DownloadEvent).detail;
      if (detail.slug !== slug) return;
      setCount((c) => c + 1);
      setAnim(true);
      t = window.setTimeout(() => setAnim(false), 600);
    }
    window.addEventListener("hack:patch-applied", onApplied);
    return () => {
      window.removeEventListener("hack:patch-applied", onApplied);
      if (t) window.clearTimeout(t);
    };
  }, [slug]);

  return (
    <span className={`inline-flex origin-left items-center gap-1.5 tabular-nums transition-transform ${anim ? "scale-110 font-semibold text-ready" : ""}`}>
      <FiDownload className="h-3.5 w-3.5 text-text-3" />
      <span>{formatCompactNumber(count)}</span>
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getPatchedVersion } from "@/utils/idb";

interface UpdateBadgeProps {
  hackSlug: string;
  currentPatchId: number;
}

export default function UpdateBadge({ hackSlug, currentPatchId }: UpdateBadgeProps) {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    getPatchedVersion(hackSlug).then((stored) => {
      if (stored && stored.patchId !== currentPatchId) {
        setHasUpdate(true);
      }
    }).catch(() => {});
  }, [hackSlug, currentPatchId]);

  if (!hasUpdate) return null;

  return (
    <span className="anim-pulse rounded-full bg-rose-600/70 px-3 py-1.5 text-sm font-semibold text-white ring-2 ring-rose-700/80 backdrop-blur-sm dark:bg-rose-500/60 dark:text-rose-100 dark:ring-rose-400/90">
      Update available
    </span>
  );
}


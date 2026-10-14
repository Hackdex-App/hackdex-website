import type React from "react";

/**
 * Arrow/Home/End keys for a role="tablist" whose tabs use a roving tabIndex (only the selected
 * one is 0): selects the next tab and moves focus to it. Put it on the tablist's onKeyDown.
 */
export function onTabListKeyDown(e: React.KeyboardEvent<HTMLElement>, count: number, current: number, select: (index: number) => void) {
  const target = ({ ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 } as Record<string, number>)[e.key];
  if (target === undefined) return;
  e.preventDefault();
  // Keeps a page-level arrow handler (the lightbox's) from also stepping.
  e.stopPropagation();
  const index = (target + count) % count;
  select(index);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[index]?.focus();
}

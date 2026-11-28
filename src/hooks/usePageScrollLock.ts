"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousHtmlOverflow = "";
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

function acquirePageScrollLock() {
  const html = document.documentElement;
  const body = document.body;

  if (lockCount === 0) {
    previousHtmlOverflow = html.style.overflow;
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }
  }

  lockCount += 1;

  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    }
  };
}

/** Locks document scrolling while the caller is mounted. Safe when overlays replace each other. */
export function usePageScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    return acquirePageScrollLock();
  }, [active]);
}

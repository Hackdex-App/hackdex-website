"use client";

import React, { useEffect } from 'react'
import Link from 'next/link'

const SubmitAuthOverlay: React.FC = () => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  return (
    <div className="fixed left-0 right-0 top-16 bottom-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Creators only"
        className="relative z-[101] mb-16 card p-6 max-w-md w-full rounded-lg"
      >
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-lg font-semibold">Creators only</div>
            <p className="mt-1 text-sm text-foreground/80">
              You need an account to submit new romhacks for others to play. It only takes a minute.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <Link
              href="/signup"
              className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold rounded-md text-[var(--accent-foreground)]"
            >
              <span>Create account</span>
            </Link>
            <Link
              href="/login?redirectTo=%2Fsubmit"
              className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmitAuthOverlay;

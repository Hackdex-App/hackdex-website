"use client";

import React, { useEffect } from 'react'
import Link from 'next/link'

type SubmitAuthOverlayProps = {
  title: string;
  message: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  ariaLabel?: string;
}

const SubmitAuthOverlay: React.FC<SubmitAuthOverlayProps> = ({
  title,
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  ariaLabel,
}) => {
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
        aria-label={ariaLabel || title}
        className="relative z-[101] mb-16 card backdrop-blur-lg dark:!bg-white/6 p-6 max-w-md w-full rounded-lg"
      >
        <div className="flex flex-col gap-8 sm:gap-4">
          <div>
            <div className="text-xl font-semibold">{title}</div>
            <p className="mt-1 text-sm text-foreground/80">{message}</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-4">
            {primaryHref && primaryLabel && (
              <Link
                href={primaryHref}
                className="shine-wrap btn-premium h-14 sm:h-11 w-full sm:w-auto text-sm font-semibold rounded-md text-[var(--accent-foreground)]"
              >
                <span>{primaryLabel}</span>
              </Link>
            )}
            {secondaryHref && secondaryLabel && (
              <Link
                href={secondaryHref}
                className="inline-flex h-14 sm:h-11 w-full sm:w-auto items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmitAuthOverlay;

"use client";

import React from "react";
import { FiChevronDown, FiHelpCircle } from "react-icons/fi";

interface HackOnboardingGateProps {
  label: string;
  onClick: () => void;
}

/**
 * Opt-in entry point for the hack page onboarding tour.
 *
 * Positions itself against the StickyActionBar root, so it must be rendered
 * inside that root: an attached tab under the desktop bar (1px overlap, no top
 * border) and a detached frost pill floating above the mobile sheet.
 */
export default function HackOnboardingGate({ label, onClick }: HackOnboardingGateProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/gate absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2 inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-2 text-xs font-semibold text-foreground/80 shadow-sm backdrop-blur transition-colors supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_90%,transparent)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] after:absolute after:-inset-x-5 after:-top-4 after:-bottom-3 after:content-[''] md:after:hidden md:bottom-auto md:top-full md:mb-0 md:-mt-px md:rounded-t-none md:rounded-b-xl md:border-t-0 md:px-5 md:pt-3.5 md:pb-2.5 md:shadow-none md:supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)]"
    >
      <FiHelpCircle
        size={14}
        aria-hidden
        className="shrink-0 text-[var(--accent)]"
      />
      {label}
      <FiChevronDown
        size={13}
        aria-hidden
        className="shrink-0 text-foreground/60 transition-transform duration-200 group-hover/gate:translate-y-0.5"
      />
    </button>
  );
}

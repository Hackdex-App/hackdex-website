"use client";

import React from "react";
import { FiChevronRight, FiHelpCircle } from "react-icons/fi";

interface HackOnboardingGateProps {
  label: string;
  onClick: () => void;
  /** Rose dot on the icon while the player is most likely stuck (no ROM yet). */
  beacon?: boolean;
  /**
   * row: full-width line under the primary action inside the patch module.
   * icon: round button beside the compact action in the site header (desktop).
   * pill: floating chip above the phone tab bar once the module scrolls away.
   */
  variant: "row" | "icon" | "pill";
  /** Row only: the tour is open. The row stays put (so the module doesn't jump) but ignores clicks and focus. */
  inactive?: boolean;
}

/** Opt-in entry point for the hack page onboarding tour, in three shapes for three homes. */
export default function HackOnboardingGate({ label, onClick, beacon = false, variant, inactive = false }: HackOnboardingGateProps) {
  const icon = (
    <span className="relative inline-flex flex-none">
      <FiHelpCircle size={variant === "row" ? 16 : 18} aria-hidden className="text-accent" />
      {beacon && <span aria-hidden className="onboarding-beacon -right-[3px] -top-[3px] h-2! w-2!" />}
    </span>
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface text-text-2 transition-colors hover:border-text-3 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {icon}
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="anim-fade fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface py-2.5 pl-3.5 pr-3 text-sm font-semibold text-text shadow-lift transition-colors hover:border-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
      >
        {icon}
        {label}
        <FiChevronRight size={15} aria-hidden className="text-text-3" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-hidden={inactive || undefined}
      tabIndex={inactive ? -1 : undefined}
      className={`${inactive ? "pointer-events-none" : ""} group/gate -mt-0.5 flex w-full cursor-pointer items-center gap-2 rounded-control border-t border-line pt-3 text-[13px] font-medium text-text-2 transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      {icon}
      {label}
      <FiChevronRight
        size={15}
        aria-hidden
        className="ml-auto text-text-3 transition-transform duration-200 group-hover/gate:translate-x-0.5"
      />
    </button>
  );
}

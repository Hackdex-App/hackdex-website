"use client";

import React from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";

export type HackOnboardingStep = "version" | "selectRom" | "agree";

interface HackOnboardingOverlayProps {
  step: HackOnboardingStep;
  /** Tour opened from the gate traps focus and locks scroll. Passive nudges do not. */
  locked: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onGotIt: () => void;
  /** Closes the card without marking steps dismissed. Fired by × and Escape. */
  onDismiss: () => void;
  /** Set while the version picker owns the screen. */
  hide: boolean;
  /** Shown in the Select ROM wait copy, e.g. "Pokemon Emerald". */
  baseRomName?: string | null;
}

const STEP_COPY: Record<HackOnboardingStep, { title: string; body: React.ReactNode }> = {
  version: {
    title: "Choose your version",
    body: "This hack has more than one release. Pick the version you want here before you patch.",
  },
  selectRom: {
    title: "The key to your download",
    body: "Hackdex does not host ROM files. You supply a clean base ROM for patching. It will be cached in your browser so you can keep using it later for other hacks.",
  },
  agree: {
    title: "One last step",
    body: (
      <>
        Excellent! Now press &quot;Agree and Patch&quot; to accept{" "}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-foreground/85 hover:text-foreground"
        >
          the Terms
        </Link>{" "}
        and build the patched ROM in your browser so you can start playing.
      </>
    ),
  },
};

interface Anchor {
  barTop: number;
  barBottom: number;
  barLeft: number;
  barRight: number;
  viewportWidth: number;
  viewportHeight: number;
  desktop: boolean;
}

function sameAnchor(a: Anchor, b: Anchor) {
  return (
    a.barTop === b.barTop &&
    a.barBottom === b.barBottom &&
    a.barLeft === b.barLeft &&
    a.barRight === b.barRight &&
    a.viewportWidth === b.viewportWidth &&
    a.viewportHeight === b.viewportHeight &&
    a.desktop === b.desktop
  );
}

/**
 * Tracks the live geometry of the sticky action bar so the coach card can sit
 * under it on desktop and above the sheet on mobile, whatever height it has.
 */
function useBarAnchor(active: boolean): Anchor | null {
  const [anchor, setAnchor] = React.useState<Anchor | null>(null);

  React.useEffect(() => {
    if (!active) return;
    const bar = document.querySelector<HTMLElement>("[data-hack-action-bar]");
    if (!bar) return;

    const measure = () => {
      const rect = bar.getBoundingClientRect();
      const next: Anchor = {
        barTop: rect.top,
        barBottom: rect.bottom,
        barLeft: rect.left,
        barRight: rect.right,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        desktop: window.matchMedia("(min-width: 768px)").matches,
      };
      setAnchor((previous) => (previous && sameAnchor(previous, next) ? previous : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  return anchor;
}

function cardPosition(anchor: Anchor, step: HackOnboardingStep): React.CSSProperties {
  if (!anchor.desktop) {
    return { left: 16, right: 16, bottom: anchor.viewportHeight - anchor.barTop + 12 };
  }
  return {
    top: anchor.barBottom + 14,
    width: 280,
    // Step 1 points back at the version chip; the ROM steps follow the CTA.
    ...(step === "version"
      ? { left: anchor.barLeft }
      : { right: anchor.viewportWidth - anchor.barRight }),
  };
}

/**
 * Coach mark for the hack page onboarding. The dimmed bar, lit control and rose
 * beacon are drawn by StickyActionBar; this owns the scrim and the card.
 */
export default function HackOnboardingOverlay({
  step,
  locked,
  isLastStep,
  onNext,
  onGotIt,
  onDismiss,
  hide,
  baseRomName,
}: HackOnboardingOverlayProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();
  const anchor = useBarAnchor(!hide);
  const copy = STEP_COPY[step];

  React.useEffect(() => {
    if (hide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hide, onDismiss]);

  React.useEffect(() => {
    if (hide || !locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [hide, locked]);

  // The card only mounts once the bar has been measured, so wait for it.
  const cardMounted = anchor !== null;
  React.useEffect(() => {
    if (hide || !locked || !cardMounted) return;
    const card = cardRef.current;
    if (!card) return;
    card.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const spotlight = Array.from(
        document.querySelectorAll<HTMLElement>("[data-onboarding-spotlight]:not([disabled])"),
      );
      const cardControls = Array.from(
        card.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"),
      );
      const focusable = [...spotlight, ...cardControls];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) return;
      const active = document.activeElement;
      const inCycle = active instanceof HTMLElement && focusable.includes(active);
      if (active === (event.shiftKey ? first : last) || !inCycle) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [hide, locked, cardMounted]);

  if (hide) return null;

  return (
    <>
      <div
        aria-hidden
        className={`fixed inset-0 z-50 ${
          locked
            ? "bg-[#171717]/25 dark:bg-black/55"
            : "pointer-events-none bg-[#171717]/8 dark:bg-black/20"
        }`}
      />
      {anchor && (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal={locked || undefined}
          aria-labelledby={titleId}
          tabIndex={-1}
          style={cardPosition(anchor, step)}
          className="anim-pop elevate fixed z-[80] rounded-xl border border-[var(--border)] bg-white p-3.5 outline-none dark:bg-[#141414]"
        >
          {(step === "selectRom" || !isLastStep) && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="absolute right-2 top-2 cursor-pointer rounded-md p-1 text-foreground/50 transition-colors hover:bg-[var(--surface-2)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <FiX size={14} aria-hidden />
            </button>
          )}
          <h4 id={titleId} className={`text-[13px] font-semibold ${step === "selectRom" || !isLastStep ? "pr-7" : ""}`}>
            {copy.title}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-foreground/70">{copy.body}</p>
          {step === "selectRom" ? (
            <p className="mt-3 text-xs font-semibold text-foreground/75">
              Select a clean {baseRomName || "base"} ROM to continue.
            </p>
          ) : (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={isLastStep ? onGotIt : onNext}
                className="inline-flex h-7 cursor-pointer items-center rounded-full bg-[var(--accent)] px-3 text-xs font-bold text-[var(--accent-foreground)] transition-[background-color,transform] hover:bg-[var(--accent-700)] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              >
                {isLastStep ? "Got it" : "Next"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

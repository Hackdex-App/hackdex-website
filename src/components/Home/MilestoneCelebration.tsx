"use client";

import { useCallback, useEffect, useRef } from "react";
import { PiConfettiBold } from "react-icons/pi";

const COLORS = ["#f43f5e", "#f97316", "#f59e0b", "#fb7185"];
/** Over the page and the sticky header (z-40), under the phone menu drawer (z-50). */
const CONFETTI_Z = 45;

/** The note under the headline. Edit per milestone; the number comes from NEXT_PUBLIC_DOWNLOADS_MILESTONE. */
const NOTE = "To celebrate, Hackdex got a fresh coat of paint: a faster Discover, drafts for creators, and AI labels on every hack page.";
const BURST_MS_DESKTOP = 2200;
const BURST_MS_MOBILE = 1400;

function formatMilestone(milestone: string): string {
  if (!/^\d+$/.test(milestone)) return milestone;

  return milestone.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 640px)").matches;
}

export default function MilestoneCelebration({ milestone }: { milestone: string }) {
  const frameRef = useRef<number | null>(null);
  const storageKey = `hackdex:downloads-milestone:${milestone}:confetti`;

  const stopConfetti = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const fireConfetti = useCallback(async () => {
    if (prefersReducedMotion()) return;

    stopConfetti();
    const { default: confetti } = await import("canvas-confetti");
    const mobile = isMobileViewport();
    const end = Date.now() + (mobile ? BURST_MS_MOBILE : BURST_MS_DESKTOP);
    const particleCount = mobile ? 2 : 3;
    const startVelocity = mobile ? 64 : 55;
    const originY = mobile ? 0.95 : 0.65;

    const frame = () => {
      if (Date.now() > end) {
        frameRef.current = null;
        return;
      }

      confetti({
        particleCount,
        angle: mobile ? 75 : 60,
        spread: mobile ? 40 : 50,
        startVelocity,
        origin: { x: 0, y: originY },
        colors: COLORS,
        disableForReducedMotion: true,
        zIndex: CONFETTI_Z,
      });
      confetti({
        particleCount,
        angle: mobile ? 105 : 120,
        spread: mobile ? 40 : 50,
        startVelocity,
        origin: { x: 1, y: originY },
        colors: COLORS,
        disableForReducedMotion: true,
        zIndex: CONFETTI_Z,
      });

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
  }, [stopConfetti]);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(storageKey) === "1";
    } catch {
      // Private browsing or storage blocked
    }

    if (alreadyShown || prefersReducedMotion()) return;

    const timer = window.setTimeout(() => {
      void fireConfetti();
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        // Private browsing or storage blocked
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      stopConfetti();
    };
  }, [fireConfetti, stopConfetti, storageKey]);

  // A strip across the content column: title and note side by side on desktop, stacked on phones.
  // The whole strip replays the confetti; hover tints it and tilts the icon so it reads as tappable.
  return (
    <button
      type="button"
      onClick={() => void fireConfetti()}
      className="group/ms mt-3 flex w-full cursor-pointer select-none items-start gap-3 rounded-card border border-[color-mix(in_srgb,var(--rose)_22%,var(--line))] bg-[color-mix(in_srgb,var(--rose)_7%,var(--surface))] py-3.5 pl-4 pr-3.5 text-left md:mt-0 md:items-center md:py-2.5 md:pl-3 md:pr-4 transition-colors duration-150 hover:border-[color-mix(in_srgb,var(--rose)_34%,var(--line))] hover:bg-[color-mix(in_srgb,var(--rose)_11%,var(--surface))]"
    >
      <span className="inline-grid h-9 w-9 flex-none place-items-center rounded-full bg-accent-soft text-accent-text md:h-[30px] md:w-[30px]">
        <PiConfettiBold aria-hidden="true" className="h-[19px] w-[19px] transition-transform duration-200 md:h-4 md:w-4 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/ms:-rotate-[14deg] group-hover/ms:scale-110 group-active/ms:rotate-[8deg] group-active/ms:scale-90" />
      </span>
      <span className="min-w-0 md:flex md:items-baseline md:gap-2.5">
        <span className="block text-[15px] font-bold leading-[1.3] text-text md:whitespace-nowrap">
          <b className="font-extrabold">{formatMilestone(milestone)} downloads.</b> Thank you!
        </span>
        <span className="mt-0.5 block text-[13.5px] leading-[1.45] text-text-2 md:mt-0">{NOTE}</span>
        <span className="sr-only"> Activate to replay the celebration confetti.</span>
      </span>
    </button>
  );
}

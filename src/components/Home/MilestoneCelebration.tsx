"use client";

import { useCallback, useEffect, useRef } from "react";
import { PiConfettiBold } from "react-icons/pi";

const STORAGE_KEY = "hackdex:500k-confetti";
const COLORS = ["#f43f5e", "#f97316", "#f59e0b", "#fb7185"];
const BURST_MS_DESKTOP = 2200;
const BURST_MS_MOBILE = 1400;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 640px)").matches;
}

export default function MilestoneCelebration() {
  const frameRef = useRef<number | null>(null);

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
      });
      confetti({
        particleCount,
        angle: mobile ? 105 : 120,
        spread: mobile ? 40 : 50,
        startVelocity,
        origin: { x: 1, y: originY },
        colors: COLORS,
        disableForReducedMotion: true,
      });

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
  }, [stopConfetti]);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private browsing or storage blocked
    }

    if (alreadyShown || prefersReducedMotion()) return;

    const timer = window.setTimeout(() => {
      void fireConfetti();
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Private browsing or storage blocked
      }
    }, 600);

    return () => {
      window.clearTimeout(timer);
      stopConfetti();
    };
  }, [fireConfetti, stopConfetti]);

  return (
    <button
      type="button"
      onClick={() => void fireConfetti()}
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm ring-1 ring-[var(--accent)]/30 bg-[var(--accent)]/10 text-foreground/90 elevate hover:ring-[var(--accent)]/50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <PiConfettiBold size={16} className="text-[var(--accent)]" aria-hidden="true" />
      <span className="font-semibold gradient-text">500,000+ downloads</span>
      <span className="-ml-0.5">Thank you!</span>
      <span className="sr-only">. Activate to replay the celebration confetti.</span>
    </button>
  );
}

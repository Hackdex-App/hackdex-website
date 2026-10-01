"use client";

import Link from "next/link";
import React from "react";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseGameLabel, baseRoms } from "@/data/baseRoms";
import type { HackCardAttributes } from "@/components/HackCard";
import Shelf from "@/components/Home/Shelf";

/** Ids of base ROMs that are linked with permission or cached, i.e. patchable right now. */
function useReadyBaseRomIds() {
  const { cached, statuses } = useBaseRoms();
  return React.useMemo(() => {
    const set = new Set<string>();
    Object.entries(cached || {}).forEach(([id, v]) => {
      if (v) set.add(id);
    });
    Object.entries(statuses || {}).forEach(([id, s]) => {
      if (s === "granted") set.add(id);
    });
    return set;
  }, [cached, statuses]);
}

interface HeroProps {
  catalog: HackCardAttributes[];
}

/**
 * Cold visitors get the promise and a way in. Once a base ROM is on this
 * device the hero turns into "N hacks are one click away" and names the linked ROMs.
 * Linking a ROM is not sold here; the hack page introduces it.
 */
export function HomeHero({ catalog }: HeroProps) {
  const readyIds = useReadyBaseRomIds();
  const readyHacks = catalog.filter((h) => h.baseRomId && readyIds.has(h.baseRomId));
  const readyNames = [...readyIds].map((id) => baseRoms.find((r) => r.id === id)?.name).filter((n): n is string => Boolean(n));
  const linked = readyIds.size > 0;

  if (linked) {
    const roms = readyNames.length === 1 ? `Your ${baseGameLabel(readyNames[0])} ROM` : `Your ${readyNames.length} base ROMs`;
    const one = readyNames.length === 1;
    return (
      <section className="max-w-[760px] py-5 md:py-10" aria-label="Your ROM">
        <h1 className="font-display text-[30px] leading-[1.08] text-balance md:text-[clamp(32px,3.6vw,44px)]">
          {readyHacks.length.toLocaleString()} {readyHacks.length === 1 ? "hack is" : "hacks are"} one click away.
        </h1>
        <p className="mt-3.5 max-w-[58ch] text-[15px] text-text-2 md:text-[17px]">
          Pick a hack and the patched file is yours in seconds. <b className="font-semibold text-text">{roms}</b> {one ? "stays" : "stay"} linked on this
          device and never {one ? "leaves" : "leave"} your browser.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-6 md:gap-5">
          <Link href="/discover?r=1" prefetch={false} className="inline-flex h-12 w-full items-center justify-center rounded-control bg-accent-deep px-6 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover active:scale-[.98] md:w-auto">
            Browse ready hacks
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[760px] py-5 md:py-10" aria-label="How Hackdex works">
      <h1 className="font-display text-[30px] leading-[1.08] text-balance md:text-[clamp(32px,3.6vw,44px)]">
        Bring your ROM once. Play everything it unlocks.
      </h1>
      <p className="mt-3.5 max-w-[58ch] text-[15px] text-text-2 md:text-[17px]">
        Link your legally-obtained base ROM one time and Hackdex caches it on your device. Patch any Pokémon ROM hack
        built for it, right in your browser, without ever re-uploading. Your files never leave your device.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-6 md:gap-5">
        <Link href="/discover" prefetch={false} className="inline-flex h-12 w-full items-center justify-center rounded-control bg-accent-deep px-6 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover active:scale-[.98] md:w-auto">
          Browse {catalog.length.toLocaleString()} hacks
        </Link>
        <a href="#how" className="text-link-hd">
          How it works
        </a>
      </div>
      <p className="mt-5 text-xs text-text-3">Supports Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.</p>
    </section>
  );
}

/** Shelf of hacks made for the ROMs on this device. Renders nothing for cold visitors. */
export function ReadyShelf({ catalog }: { catalog: HackCardAttributes[] }) {
  const readyIds = useReadyBaseRomIds();
  if (readyIds.size === 0) return null;
  const ready = catalog.filter((h) => h.baseRomId && readyIds.has(h.baseRomId)).slice(0, 12);
  const names = [...readyIds].map((id) => baseRoms.find((r) => r.id === id)?.name).filter((n): n is string => Boolean(n));
  const title = names.length === 1 ? `Ready for your ${baseGameLabel(names[0])}` : "Ready to patch";
  return <Shelf title={title} blurb="Made for the ROM you linked. Patch any of them now." href="/discover?r=1" hacks={ready} />;
}

/** Cold visitors only; the linked hero has no reason to explain linking. */
export function HowItWorksGate({ children }: { children: React.ReactNode }) {
  const readyIds = useReadyBaseRomIds();
  if (readyIds.size > 0) return null;
  return <>{children}</>;
}

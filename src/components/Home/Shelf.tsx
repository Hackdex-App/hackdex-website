"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import HackCard, { type HackCardAttributes } from "@/components/HackCard";

interface ShelfProps {
  title: string;
  blurb?: string;
  href: string;
  hacks: HackCardAttributes[];
}

/**
 * A row of cards. Cards peek past the edge, and on desktop floating arrows page
 * the row so the peek never reads as broken; each arrow hides at its end and
 * both only show while the shelf is hovered or focused. Phones keep native swipe.
 */
export default function Shelf({ title, blurb, href, hacks }: ShelfProps) {
  const track = useRef<HTMLDivElement | null>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEnds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [hacks.length]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth - 120), behavior: "smooth" });
  };

  if (hacks.length === 0) return null;

  const arrow =
    "absolute top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-text text-bg shadow-overlay opacity-0 transition-[opacity,transform,background-color] duration-[120ms] hover:scale-[1.06] hover:bg-text-2 active:scale-[.96] group-hover/shelf:opacity-100 focus-visible:opacity-100 md:inline-flex";

  return (
    <section className="group/shelf mb-7 md:mb-9" aria-label={title}>
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-[22px]">{title}</h2>
        {blurb && <p className="order-3 min-w-0 flex-[1_1_100%] text-sm text-text-2 md:order-none md:flex-1 md:truncate">{blurb}</p>}
        <Link href={href} className="text-link-hd ml-auto whitespace-nowrap text-sm md:ml-0">
          See all
        </Link>
      </header>
      <div className="relative">
        <div
          ref={track}
          className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 pt-1 [scroll-padding-inline:24px] [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden"
        >
          {hacks.map((hack) => (
            <HackCard key={hack.slug} hack={hack} prefetch className="w-[264px] flex-none snap-start" />
          ))}
        </div>
        {!ends.start && (
          <button type="button" className={`${arrow} -left-[22px]`} onClick={() => page(-1)} aria-label={`Scroll ${title} back`}>
            <FiChevronLeft className="h-5 w-5" />
          </button>
        )}
        {!ends.end && (
          <button type="button" className={`${arrow} -right-[22px]`} onClick={() => page(1)} aria-label={`Scroll ${title} forward`}>
            <FiChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}

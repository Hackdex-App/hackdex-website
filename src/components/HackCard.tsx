"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { usePathname } from "next/navigation";
import { FaRegImages } from "react-icons/fa6";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import { formatCompactNumber, formatRelativeDate, OrderedTag } from "@/utils/format";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms, type Platform } from "@/data/baseRoms";
import type { Database } from "@/types/db";

export interface HackCardAttributes {
  slug: string;
  title: string;
  author: string;
  /** Screenshots in display order; the first one is the card cover. */
  covers: string[];
  tags: OrderedTag[];
  downloads: number;
  baseRomId?: string;
  version: string;
  summary?: string;
  description?: string;
  is_archive: boolean;
  completion_status?: Database["public"]["Enums"]["Completion Status"] | null;
  /** ISO date of the latest published patch; shown as "3 hours ago" / "Mar 2025". */
  updatedAt?: string | null;
}

interface HackCardProps {
  hack: HackCardAttributes;
  clickable?: boolean;
  prefetch?: LinkProps["prefetch"];
  className?: string;
  /** Phone grid: stretch the screenshot to the card width so grid and list read as different views. */
  fill?: boolean;
}

function useReadiness(baseRomId?: string) {
  const { hasPermission, hasCached } = useBaseRoms();
  const base = baseRoms.find((r) => r.id === baseRomId);
  const ready = base ? hasPermission(base.id) || hasCached(base.id) : false;
  return { base, ready };
}

/** Short base ROM label for a card: "FireRed" rather than "Pokémon FireRed (Rev 0)". */
function shortBaseName(name: string) {
  return name.replace(/^Pokémon\s+/, "").replace(/\s*\(Rev \d+\)$/, "");
}

/** Anything short of Complete gets an outline pill so a demo never reads like a finished game. */
function CompletionBadge({ status }: { status?: HackCardAttributes["completion_status"] }) {
  if (!status || status === "Complete") return null;
  return (
    <span className="ml-auto flex-none rounded-full border border-line-strong px-[7px] text-[11px] font-semibold leading-[18px] tracking-[.01em] text-text-2">
      {status}
    </span>
  );
}

/** Pixel art only stays crisp at whole-number scales; anything else is smoothed. */
function snapRendering(img: HTMLImageElement) {
  const integer = img.naturalWidth > 0 && img.clientWidth > 0 && img.clientWidth % img.naturalWidth === 0;
  img.classList.toggle("pixelated", integer);
}

/**
 * Swipeable screenshots, first one is the cover. Drag to browse, dots to jump,
 * and a drag never counts as a click on the link. Desktop also gets edge
 * chevrons on hover, since dots are small targets. DS shots are 4:3 per screen;
 * a portrait 256×384 shot crops to its top screen here and opens whole in the lightbox.
 */
function Shots({ images, platform, ready, fill, placeholder }: { images: string[]; platform?: Platform; ready: boolean; fill?: boolean; placeholder: boolean }) {
  const many = images.length > 1;
  const [viewportRef, api] = useEmblaCarousel({ loop: true, active: many });
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const nds = platform === "NDS";
  const ratio = nds ? "aspect-[4/3]" : "aspect-[3/2]";
  // Native width on desktop; `fill` stretches to the card on phones (literal strings so Tailwind sees them).
  const shotWidth = fill
    ? nds ? "w-full md:w-[min(256px,100%)]" : "w-full md:w-[min(240px,100%)]"
    : nds ? "w-[min(256px,100%)]" : "w-[min(240px,100%)]";

  return (
    <span
      className="relative flex items-center justify-center bg-well p-3"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        dragged.current = false;
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (s && !dragged.current && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 5) dragged.current = true;
      }}
      onClickCapture={(e) => {
        if (dragged.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {placeholder ? (
        <span className={`flex ${ratio} ${shotWidth} items-center justify-center rounded-frame bg-screen/10 text-text-3`}>
          <FaRegImages className="text-[64px] opacity-40" />
        </span>
      ) : (
        <span
          ref={viewportRef}
          className={`block overflow-hidden rounded-frame ring-2 transition-shadow duration-400 ${many ? "cursor-grab active:cursor-grabbing" : ""} ${
            ready ? "ring-ready" : "ring-transparent"
          } ${shotWidth}`}
        >
          <span className="flex">
            {images.map((src, i) => (
              <span key={`${src}-${i}`} className="min-w-0 flex-[0_0_100%]">
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  onLoad={(e) => snapRendering(e.currentTarget)}
                  className={`block h-auto w-full ${ratio} object-cover object-top`}
                />
              </span>
            ))}
          </span>
        </span>
      )}
      {many && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Previous screenshot"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              api?.scrollPrev();
            }}
            className="absolute left-4 top-1/2 z-[2] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(13,16,23,.6)] text-white opacity-0 transition-opacity duration-[120ms] hover:bg-[rgba(13,16,23,.85)] group-hover/card:opacity-100 md:inline-flex"
          >
            <FiChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Next screenshot"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              api?.scrollNext();
            }}
            className="absolute right-4 top-1/2 z-[2] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(13,16,23,.6)] text-white opacity-0 transition-opacity duration-[120ms] hover:bg-[rgba(13,16,23,.85)] group-hover/card:opacity-100 md:inline-flex"
          >
            <FiChevronRight className="h-[18px] w-[18px]" />
          </button>
          <span className="pointer-events-none absolute inset-x-0 bottom-[18px] flex justify-center gap-1.5" aria-hidden>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                aria-current={i === index || undefined}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  api?.scrollTo(i);
                }}
                className="pointer-events-auto inline-flex h-3.5 w-3.5 items-center justify-center before:h-1.5 before:w-1.5 before:rounded-full before:bg-white/50 before:shadow-[0_0_0_1px_rgba(0,0,0,.4)] before:transition-[background-color,transform] before:duration-[120ms] before:content-[''] hover:before:bg-white/80 aria-[current]:before:scale-125 aria-[current]:before:bg-white"
              />
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function Facts({ hack, base, ready, version = false, column = false }: { hack: HackCardAttributes; base?: (typeof baseRoms)[number]; ready: boolean; version?: boolean; column?: boolean }) {
  const updated = formatRelativeDate(hack.updatedAt);
  return (
    <span
      className={`flex items-center gap-2.5 overflow-hidden whitespace-nowrap text-[13px] leading-tight text-text-3 ${
        column ? "flex-col items-end gap-1 text-right" : "mt-2.5"
      }`}
    >
      {ready ? (
        <span className="inline-flex flex-none items-center gap-1.5 text-text-2">
          <span className="ready-dot" /> Ready
        </span>
      ) : (
        <span className="plat-dot flex-none text-text-2" data-platform={base?.platform}>
          {base ? shortBaseName(base.name) : "Unknown base"}
        </span>
      )}
      {version && <span className="truncate">{hack.version}</span>}
      {updated && <span className={`truncate ${column ? "order-1" : ""}`}>{updated}</span>}
      <span
        className={`inline-flex flex-none items-center gap-[3px] font-medium ${column ? "text-[15px] text-text" : "ml-auto text-text-2"}`}
        aria-label={`${formatCompactNumber(hack.downloads)} downloads`}
      >
        <FiDownload className="h-3.5 w-3.5 text-text-3" />
        {formatCompactNumber(hack.downloads)}
      </span>
    </span>
  );
}

/** Grid card: cover carousel, title, author + completion, summary, first two tags, then base / updated / downloads. */
export default function HackCard({ hack, clickable = true, prefetch = false, className = "", fill = false }: HackCardProps) {
  const { base, ready } = useReadiness(hack.baseRomId);
  const images = hack.covers.filter(Boolean);
  const pathname = usePathname();
  const placeholder = (pathname || "").startsWith("/submit") && images.length === 0;
  const [pressed, setPressed] = useState(false);

  const body = (
    <>
      <Shots images={images} platform={base?.platform} ready={ready} fill={fill} placeholder={placeholder} />
      <span className="flex flex-col gap-[3px] px-3.5 pb-3.5 pt-3">
        <span className="line-clamp-2 text-[15px] font-semibold leading-tight">{hack.title}</span>
        <span className="flex items-center gap-2 text-[13px] text-text-2">
          <span className="min-w-0 truncate">{hack.author}</span>
          <CompletionBadge status={hack.completion_status} />
        </span>
        {hack.summary && (
          <span className="mt-1 line-clamp-2 text-[13px] leading-[1.4] text-text-2">{hack.summary}</span>
        )}
        {hack.tags.length > 0 && (
          <span className="mt-2 flex gap-1.5 overflow-hidden" aria-label="Tags">
            {hack.tags.slice(0, 2).map((t) => (
              <span key={t.name} className="flex-none rounded-full bg-surface-2 px-2 py-px text-xs text-text-2">
                {t.name}
              </span>
            ))}
          </span>
        )}
        <Facts hack={hack} base={base} ready={ready} />
      </span>
    </>
  );

  const shell = `group/card block overflow-hidden rounded-card border border-line bg-surface shadow-rest transition-[transform,box-shadow,border-color] duration-150 ease-out ${
    clickable ? `hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift active:scale-[.99] ${pressed ? "anim-float" : ""}` : ""
  } ${className}`.trim();

  if (!clickable) return <div className={shell}>{body}</div>;
  return (
    <Link
      href={`/hack/${hack.slug}`}
      prefetch={prefetch}
      className={`${shell} flex h-full flex-col`}
      // Links are draggable by default, which would beat the carousel's drag.
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={() => setPressed(true)}
    >
      {body}
    </Link>
  );
}

/** List row: 120×80 thumb, title + author, one-line summary, four tags, facts stacked at the right on desktop. */
export function HackRow({ hack, prefetch = false }: { hack: HackCardAttributes; prefetch?: LinkProps["prefetch"] }) {
  const { base, ready } = useReadiness(hack.baseRomId);
  const cover = hack.covers.find(Boolean);
  return (
    <Link
      href={`/hack/${hack.slug}`}
      prefetch={prefetch}
      className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-rest transition-[box-shadow,border-color] duration-150 hover:border-line-strong hover:shadow-lift md:grid-cols-[120px_minmax(0,1fr)_auto]"
    >
      <span className={`block h-20 w-[120px] overflow-hidden rounded-frame bg-well ring-2 transition-shadow duration-400 ${ready ? "ring-ready" : "ring-transparent"}`}>
        {cover && <img src={cover} alt="" width={120} height={80} loading="lazy" className="h-full w-full object-cover object-top" />}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold leading-tight">
          {hack.title} <span className="text-[13px] font-normal text-text-2">by {hack.author}</span>
        </span>
        {hack.summary && <span className="truncate text-sm text-text-2">{hack.summary}</span>}
        {hack.tags.length > 0 && (
          <span className="flex gap-1.5 overflow-hidden">
            {hack.tags.slice(0, 4).map((t) => (
              <span key={t.name} className="flex-none rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-2">
                {t.name}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="hidden md:block">
        <Facts hack={hack} base={base} ready={ready} version column />
      </span>
    </Link>
  );
}

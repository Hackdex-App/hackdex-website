"use client";

import Link from "next/link";
import type { LinkProps } from "next/link";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
import { RiArchiveStackFill } from "react-icons/ri";
import { formatCompactNumber, OrderedTag } from "@/utils/format";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseGameLabel, baseRoms, type Platform } from "@/data/baseRoms";
import type { Database } from "@/types/db";
import Handle from "@/components/Primitives/Handle";

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
}

interface HackCardProps {
  hack: HackCardAttributes;
  clickable?: boolean;
  prefetch?: LinkProps["prefetch"];
  className?: string;
  /** Phone grid: stretch the screenshot to the card width so grid and list read as different views. */
  fill?: boolean;
}

/**
 * Whether the player can patch this hack right now. "permission" means the ROM
 * is linked but the browser needs file access granted again. Archives have no
 * download, so they are never either.
 */
function useReadiness(hack: HackCardAttributes) {
  const { isLinked, hasPermission, hasCached } = useBaseRoms();
  const base = baseRoms.find((r) => r.id === hack.baseRomId);
  const ready = base && !hack.is_archive ? hasPermission(base.id) || hasCached(base.id) : false;
  const needsPermission = base && !hack.is_archive && !ready ? isLinked(base.id) : false;
  return { base, ready, needsPermission };
}

/** Summary, or the start of the description for hacks that never got one. */
function blurb(hack: HackCardAttributes) {
  if (hack.summary) return hack.summary;
  const text = hack.description?.trim() ?? "";
  return text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text;
}

/** Anything short of Complete gets an outline pill so a demo never reads like a finished game. */
function CompletionBadge({ status }: { status?: HackCardAttributes["completion_status"] }) {
  if (!status || status === "Complete") return null;
  return (
    <span className="flex-none rounded-full border border-line-strong px-[7px] text-[11px] font-semibold leading-[18px] tracking-[.01em] text-text-2">
      {status}
    </span>
  );
}

/**
 * Ready (base ROM linked): a light green tint and a faintly green border instead of an outline, so a
 * grid where every card is ready stays calm. Replaces bg-surface/border-line on the card.
 */
const READY_SURFACE =
  "border-[color-mix(in_srgb,var(--ready)_22%,var(--line))] bg-[color-mix(in_srgb,var(--ready)_4%,var(--surface))] dark:bg-[color-mix(in_srgb,var(--ready)_5%,var(--surface))]";
const READY_HOVER = "hover:border-[color-mix(in_srgb,var(--ready)_40%,var(--line))]";
/** Tag pills shade whatever they sit on (about surface-2 on a plain card), so they keep contrast on the Ready tint. */
const TAG_PILL = "bg-text/[.08]";

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
function Shots({ images, platform, fill }: { images: string[]; platform?: Platform; fill?: boolean }) {
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
      <span
        ref={viewportRef}
        className={`block overflow-hidden rounded-frame ${many ? "cursor-grab active:cursor-grabbing" : ""} ${shotWidth}`}
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

function Facts({ hack, version = false, column = false, ...readiness }: ReturnType<typeof useReadiness> & { hack: HackCardAttributes; version?: boolean; column?: boolean }) {
  const { base, ready, needsPermission } = readiness;
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
      ) : needsPermission ? (
        <span className="inline-flex flex-none items-center gap-1.5 text-text-2" title="Your ROM is linked. Allow access again to patch.">
          <span className="h-2 w-2 rounded-full bg-warn" /> Permission needed
        </span>
      ) : (
        <span className="plat-dot flex-none text-text-2" data-platform={base?.platform}>
          {base ? baseGameLabel(base.name) : "Unknown base"}
        </span>
      )}
      {version && <span className="truncate">{hack.version}</span>}
      {hack.is_archive ? (
        <span className={`inline-flex flex-none items-center gap-1 font-medium text-text-2 ${column ? "" : "ml-auto"}`} title="Listed for the record. No download.">
          <RiArchiveStackFill className="h-3.5 w-3.5 text-text-3" /> Archive
        </span>
      ) : (
        <span
          className={`inline-flex flex-none items-center gap-[3px] font-medium ${column ? "text-[15px] text-text" : "ml-auto text-text-2"}`}
          aria-label={`${formatCompactNumber(hack.downloads)} downloads`}
        >
          <FiDownload className="h-3.5 w-3.5 text-text-3" />
          {formatCompactNumber(hack.downloads)}
        </span>
      )}
    </span>
  );
}

/** Grid card: cover carousel, title, author + completion, summary, first two tags, then base / downloads. */
export default function HackCard({ hack, clickable = true, prefetch = false, className = "", fill = false }: HackCardProps) {
  const readiness = useReadiness(hack);
  const { base, ready } = readiness;
  const summary = blurb(hack);
  const images = hack.covers.filter(Boolean);
  const [pressed, setPressed] = useState(false);

  const body = (
    <>
      <Shots images={images} platform={base?.platform} fill={fill} />
      <span className="flex flex-col gap-[3px] px-3.5 pb-3.5 pt-3">
        <span className="line-clamp-2 text-[15px] font-semibold leading-tight">{hack.title}</span>
        <span className="flex items-center gap-2 text-[13px] text-text-2">
          <Handle name={hack.author} className="min-w-0 truncate" />
          <span className="ml-auto inline-flex flex-none items-center gap-1.5">
            <CompletionBadge status={hack.completion_status} />
            {hack.version && <span className="font-mono text-[11px] text-text-3" title="Current version">{hack.version}</span>}
          </span>
        </span>
        {summary && <span className="mt-1 line-clamp-2 text-[13px] leading-[1.4] text-text-2">{summary}</span>}
        {hack.tags.length > 0 && (
          <span className="mt-2 flex gap-1.5 overflow-hidden" aria-label="Tags">
            {hack.tags.slice(0, 2).map((t) => (
              <span key={t.name} className={`flex-none rounded-full px-2 py-px text-xs text-text-2 ${TAG_PILL}`}>
                {t.name}
              </span>
            ))}
          </span>
        )}
        <Facts hack={hack} {...readiness} />
      </span>
    </>
  );

  const shell = `group/card block overflow-hidden rounded-card border shadow-rest transition-[transform,box-shadow,border-color] duration-150 ease-out ${
    ready ? READY_SURFACE : "border-line bg-surface"
  } ${clickable ? `hover:-translate-y-0.5 hover:shadow-lift active:scale-[.99] ${ready ? READY_HOVER : "hover:border-line-strong"} ${pressed ? "anim-float" : ""}` : ""} ${className}`.trim();

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
  const readiness = useReadiness(hack);
  const summary = blurb(hack);
  const cover = hack.covers.find(Boolean);
  return (
    <Link
      href={`/hack/${hack.slug}`}
      prefetch={prefetch}
      className={`grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 rounded-card border p-3 shadow-rest transition-[box-shadow,border-color] duration-150 hover:shadow-lift md:grid-cols-[120px_minmax(0,1fr)_auto] ${
        readiness.ready ? `${READY_SURFACE} ${READY_HOVER}` : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <span className="block h-20 w-[120px] overflow-hidden rounded-frame bg-well">
        {cover && <img src={cover} alt="" width={120} height={80} loading="lazy" className="h-full w-full object-cover object-top" />}
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[15px] font-semibold leading-tight">
          {hack.title} <span className="text-[13px] font-normal text-text-2">by <Handle name={hack.author} /></span>
        </span>
        {summary && <span className="truncate text-sm text-text-2">{summary}</span>}
        {hack.tags.length > 0 && (
          <span className="flex gap-1.5 overflow-hidden">
            {hack.tags.slice(0, 4).map((t) => (
              <span key={t.name} className={`flex-none rounded-full px-2 py-0.5 text-xs text-text-2 ${TAG_PILL}`}>
                {t.name}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="hidden md:block">
        <Facts hack={hack} {...readiness} version column />
      </span>
    </Link>
  );
}

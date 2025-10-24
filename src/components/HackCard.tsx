import Image from "next/image";
import PixelImage from "./PixelImage";
import Link from "next/link";
import { formatCompactNumber } from "@/utils/format";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { usePathname } from "next/navigation";
import { FaRegImages } from "react-icons/fa6";

type CardHack = {
  slug: string;
  title: string;
  author: string;
  covers: string[];
  tags: string[];
  downloads: number;
  baseRomId?: string;
  version: string;
  summary?: string;
  description?: string;
};

export default function HackCard({ hack, clickable = true, className = "" }: { hack: CardHack; clickable?: boolean; className?: string }) {
  const { isLinked, hasPermission, hasCached } = useBaseRoms();
  const match = baseRoms.find((r) => r.id === hack.baseRomId);
  const baseId = match?.id ?? undefined;
  const baseName = match?.name ?? undefined;
  const linked = baseId ? isLinked(baseId) : false;
  const ready = baseId ? hasPermission(baseId) || hasCached(baseId) : false;
  const images = (hack.covers && hack.covers.length > 0 ? hack.covers : []).filter(Boolean);
  const isCarousel = images.length > 1;
  const pathname = usePathname();
  const showTitlePlaceholder = (pathname || "").startsWith("/submit") && images.length === 0;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);
  const cardClass = `rounded-[12px] overflow-hidden ${
    clickable ? "transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl anim-float" : ""
  } ring-1 ${ready ? "ring-emerald-400/50 bg-emerald-500/10" : "card ring-[var(--border)]"}`;
  const gradientBgClass = `bg-gradient-to-b ${ready ? 'from-emerald-300/5 to-emerald-400/30 dark:from-emerald-950/10 dark:to-emerald-600/40' : 'from-black/30 to-black/10 dark:from-black/80 dark:to-black/40'}`;
  const shadowClass = `shadow-xl ${ready ? "shadow-emerald-700/40 dark:shadow-emerald-200/40" : "shadow-slate-500/40 dark:shadow-slate-300/40"}`;
  const content = (
      <div className={cardClass}>
        <div className="relative aspect-[3/2] w-full rounded-[12px] overflow-hidden">
          <div className={`absolute inset-0 ${gradientBgClass}`} />
          {showTitlePlaceholder ? (
            <div className="h-full w-full flex items-center justify-center">
              <FaRegImages className={`text-[10rem] ${ready ? "text-emerald-600/40 dark:text-emerald-300/40" : "text-black/20 dark:text-white/30"} select-none text-center`} />
            </div>
          ) : isCarousel ? (
            <div className="overflow-hidden h-full" ref={emblaRef}>
              <div className="flex h-full">
                {images.map((src, idx) => (
                  <div className="relative h-full flex-[0_0_100%]" key={`${src}-${idx}`}>
                    <PixelImage
                      src={src}
                      alt={hack.title}
                      mode="contain"
                      className={`absolute inset-0 ${clickable ? "transition-transform duration-300 group-hover:scale-[1.05]" : ""}`}
                      imgClassName={shadowClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : images[0] ? (
            <div className="relative h-full">
              <PixelImage
                src={images[0]}
                alt={hack.title}
                mode="contain"
                className={`${clickable ? "transition-transform duration-300 group-hover:scale-[1.05]" : ""}`}
                imgClassName={shadowClass}
              />
            </div>
          ) : null}

          <div className="absolute left-3 top-3 z-10 flex gap-2">
            {hack.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full px-2 py-0.5 text-xs ring-1 ring-foreground/20 dark:ring-foreground/30 bg-background/70 text-foreground/90 backdrop-blur-md"
              >
                {t}
              </span>
            ))}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ring-1 backdrop-blur-md ${
                ready
                  ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90"
                  : linked
                  ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90"
                  : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"
              }`}
            >
              {ready ? "Ready" : linked ? "Permission needed" : "Base ROM needed"}
            </span>
          </div>
          {isCarousel && (
            <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-3">
              {images.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Show image ${i + 1}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    emblaApi && emblaApi.scrollTo(i);
                  }}
                  className={`h-1.5 w-1.5 rounded-full ring-1 transition-all ${
                    i === selectedIndex
                      ? "bg-[var(--foreground)]/80 ring-[var(--foreground)]/60"
                      : "bg-[var(--foreground)]/30 ring-[var(--foreground)]/30 hover:bg-[var(--foreground)]/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
                  {hack.title}
                </h3>
                <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-foreground/85 ring-1 ring-[var(--border)]">
                  {hack.version}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground/60">By {hack.author}</p>
            </div>
          <div className="flex items-center gap-1 text-sm text-foreground/70">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{formatCompactNumber(hack.downloads)}</span>
          </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-foreground/70">
            {(() => {
              const text = (hack as any).summary ?? (hack as any).description ?? "";
              return text.length > 120 ? text.slice(0, 120).trimEnd() + "…" : text;
            })()}
          </p>
          <div className="mt-3 text-xs text-foreground/60">Base: {baseName ?? "Unknown"}</div>
        </div>
      </div>
  );
  if (clickable) {
    return (
      <Link href={`/hack/${hack.slug}`} className={`group block ${className}`.trim()}>
        {content}
      </Link>
    );
  }
  return <div className={`group block ${className}`.trim()}>{content}</div>;
}



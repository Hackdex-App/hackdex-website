"use client";

import PixelImage from "../PixelImage";
import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { FiChevronLeft, FiChevronRight, FiGrid, FiX } from "react-icons/fi";

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      if (emblaApi) emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);
  return (
    <div className="card-simple p-4">
      <div className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {images.map((src, idx) => (
              <div key={`${src}-${idx}`} className="relative h-full flex-[0_0_100%]">
                <button onClick={() => setLightboxOpen(true)} className="absolute inset-0">
                  <PixelImage src={src} alt={title} mode="contain" className="absolute inset-0" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Previous image"
          disabled={images.length < 2}
          onClick={() => emblaApi && emblaApi.scrollPrev()}
          className="absolute left-0 top-1/2 z-10 -translate-x-2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,black_30%,transparent)] p-2 text-white ring-1 ring-white/30 hover:bg-[color-mix(in_oklab,black_50%,transparent)] disabled:pointer-events-none disabled:opacity-40 dark:bg-black/30 dark:hover:bg-black/50"
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          disabled={images.length < 2}
          onClick={() => emblaApi && emblaApi.scrollNext()}
          className="absolute right-0 top-1/2 z-10 translate-x-2 -translate-y-1/2 rounded-full bg-[color-mix(in_oklab,black_30%,transparent)] p-2 text-white ring-1 ring-white/30 hover:bg-[color-mix(in_oklab,black_50%,transparent)] disabled:pointer-events-none disabled:opacity-40 dark:bg-black/30 dark:hover:bg-black/50"
        >
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            onClick={() => emblaApi && emblaApi.scrollTo(i)}
            className={`relative h-16 w-28 overflow-hidden rounded border-2 ${
              i === selectedIndex ? "border-[var(--accent)]" : "border-[var(--border)]"
            }`}
            aria-label={`Show image ${i + 1}`}
          >
            <img src={src} alt={`${title} screenshot ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox images={images} startIndex={selectedIndex} title={title} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

const DESKTOP_LIGHTBOX = "(min-width: 768px)";

function isDesktopLightbox() {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_LIGHTBOX).matches;
}

function Lightbox({ images, startIndex, title, onClose }: { images: string[]; startIndex: number; title: string; onClose: () => void }) {
  const [index, setIndex] = React.useState(startIndex);
  const [pixelPerfect, setPixelPerfect] = React.useState(isDesktopLightbox);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const canCycle = images.length > 1;
  const onPrev = React.useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const onNext = React.useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (!canCycle) return;
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCycle, onClose, onNext, onPrev]);
  React.useEffect(() => {
    closeRef.current?.focus();
  }, []);
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }
    const preventTouchScroll = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);
  React.useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LIGHTBOX);
    const sync = () => {
      if (mq.matches) setPixelPerfect(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const controlClass =
    "rounded-full text-white/80 ring-1 ring-white/30 transition-colors hover:bg-white/10 hover:text-white active:bg-white/10 active:text-white focus:outline-none disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Screenshots for ${title}`}>
      <div className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto flex h-full max-w-6xl px-0 md:px-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative flex min-h-0 w-full flex-col">
          <div className="mb-3 flex justify-end pt-[calc(1rem+env(safe-area-inset-top,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] md:px-0 md:pt-4">
            <button
              type="button"
              ref={closeRef}
              className={`${controlClass} flex h-10 w-10 items-center justify-center`}
              onClick={onClose}
              aria-label="Close lightbox"
            >
              <FiX size={24} />
            </button>
          </div>
          <div
            className="relative min-h-0 flex-1 overflow-hidden rounded"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <PixelImage
              src={images[index]}
              alt={`${title} screenshot ${index + 1}`}
              mode="contain"
              pixelPerfect={pixelPerfect}
              className="absolute inset-0"
            />
          </div>
          <div className="mt-3 flex flex-col items-center gap-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] md:px-0 md:pb-4">
            <button
              type="button"
              role="switch"
              aria-checked={pixelPerfect}
              onClick={() => setPixelPerfect((enabled) => !enabled)}
              className="flex items-center gap-2 rounded-full px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white active:bg-white/10 active:text-white focus:outline-none md:hidden"
            >
              <FiGrid className="h-4 w-4" aria-hidden="true" />
              <span>Pixel-perfect</span>
              <span
                aria-hidden="true"
                className={`flex h-4 w-8 items-center rounded-full p-0.5 ring-1 ring-white/30 transition-colors ${
                  pixelPerfect ? "bg-white/80" : "bg-white/10"
                }`}
              >
                <span
                  className={`h-3 w-3 rounded-full transition-transform ${
                    pixelPerfect ? "translate-x-4 bg-black/70" : "translate-x-0 bg-white/80"
                  }`}
                />
              </span>
            </button>
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center md:flex md:justify-center">
              <button
                type="button"
                aria-label="Previous image"
                disabled={!canCycle}
                onClick={onPrev}
                className={`${controlClass} flex h-14 w-14 items-center justify-center justify-self-start md:hidden`}
              >
                <FiChevronLeft className="h-7 w-7" />
              </button>
              <div className="rounded-full bg-black/20 px-3 py-1 text-sm text-white ring-1 ring-white/30 md:text-xs" aria-live="polite">
                {index + 1} / {images.length}
              </div>
              <button
                type="button"
                aria-label="Next image"
                disabled={!canCycle}
                onClick={onNext}
                className={`${controlClass} flex h-14 w-14 items-center justify-center justify-self-end md:hidden`}
              >
                <FiChevronRight className="h-7 w-7" />
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="Previous image"
          disabled={!canCycle}
          onClick={onPrev}
          className={`${controlClass} absolute left-4 top-1/2 hidden -translate-y-1/2 p-3 md:block`}
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next image"
          disabled={!canCycle}
          onClick={onNext}
          className={`${controlClass} absolute right-4 top-1/2 hidden -translate-y-1/2 p-3 md:block`}
        >
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}



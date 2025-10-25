"use client";

import PixelImage from "../PixelImage";
import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";

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
    <div className="card p-4">
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
        <div className="pointer-events-auto absolute inset-y-0 left-0 flex items-center">
          <button
            aria-label="Previous image"
            onClick={() => emblaApi && emblaApi.scrollPrev()}
            className="m-2 rounded-full bg-[color-mix(in_oklab,black_30%,transparent)] p-2 text-white ring-1 ring-white/30 hover:bg-[color-mix(in_oklab,black_50%,transparent)] dark:bg-black/30 dark:hover:bg-black/50"
          >
            ‹
          </button>
        </div>
        <div className="pointer-events-auto absolute inset-y-0 right-0 flex items-center">
          <button
            aria-label="Next image"
            onClick={() => emblaApi && emblaApi.scrollNext()}
            className="m-2 rounded-full bg-[color-mix(in_oklab,black_30%,transparent)] p-2 text-white ring-1 ring-white/30 hover:bg-[color-mix(in_oklab,black_50%,transparent)] dark:bg-black/30 dark:hover:bg-black/50"
          >
            ›
          </button>
        </div>
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
            <Image src={src} alt={`${title} screenshot ${i + 1}`} fill className="absolute inset-0 object-cover" />
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox images={images} startIndex={selectedIndex} title={title} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}

function Lightbox({ images, startIndex, title, onClose }: { images: string[]; startIndex: number; title: string; onClose: () => void }) {
  const [index, setIndex] = React.useState(startIndex);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const onPrev = React.useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const onNext = React.useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);
  React.useEffect(() => {
    closeRef.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Screenshots for ${title}`}>
      <div className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto flex h-full max-w-6xl items-center px-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full">
          <div
            className="relative aspect-[16/9] w-full overflow-hidden rounded"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <PixelImage src={images[index]} alt={`${title} screenshot ${index + 1}`} mode="contain" className="absolute inset-0" />
          </div>
          <div className="mt-3 flex items-center justify-center">
            <div className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-foreground ring-1 ring-[var(--border)]" aria-live="polite">
              {index + 1} / {images.length}
            </div>
          </div>
          <button
            type="button"
            ref={closeRef}
            className="absolute right-3 top-3 rounded bg-[var(--surface-2)] px-3 py-1 text-sm text-foreground ring-1 ring-[var(--border)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            onClick={onClose}
            aria-label="Close lightbox"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          aria-label="Previous image"
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-2)] p-3 text-foreground ring-1 ring-[var(--border)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next image"
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-2)] p-3 text-foreground ring-1 ring-[var(--border)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          ›
        </button>
      </div>
    </div>
  );
}



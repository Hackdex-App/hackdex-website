"use client";

import PixelImage from "../PixelImage";
import React from "react";
import { FiChevronLeft, FiChevronRight, FiGrid, FiX } from "react-icons/fi";
import { useDialog } from "@/hooks/useDialog";
import { onTabListKeyDown } from "@/utils/tabKeys";

const DESKTOP_LIGHTBOX = "(min-width: 768px)";

function isDesktopLightbox() {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_LIGHTBOX).matches;
}

interface LightboxProps {
  images: string[];
  index: number;
  title: string;
  onChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Full-window screenshot viewer. Desktop shows the image at the largest whole
 * multiple of its native size so pixels stay square; phones can toggle that.
 * Arrow keys and the filmstrip move between shots. Escape, clicking outside the
 * image, and Close all close it; focus stays inside and returns to the opener.
 */
export default function Lightbox({ images, index, title, onChange, onClose }: LightboxProps) {
  const [pixelPerfect, setPixelPerfect] = React.useState(isDesktopLightbox);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const canCycle = images.length > 1;
  const onPrev = React.useCallback(() => onChange((index - 1 + images.length) % images.length), [images.length, index, onChange]);
  const onNext = React.useCallback(() => onChange((index + 1) % images.length), [images.length, index, onChange]);

  // Keep the layout from shifting when the scrollbar goes, and stop touch scrolling behind the viewer
  // (except in the thumbnail strip, which scrolls sideways; touch-pan-x keeps it from panning the page).
  // Declared before useDialog so it measures the scrollbar before useDialog locks <html>; each owns
  // different styles, since cleanups run in declaration order and nested save/restore of one style
  // left the page stuck on overflow: hidden.
  React.useEffect(() => {
    const body = document.body;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    const preventTouchScroll = (e: TouchEvent) => {
      if (!(e.target instanceof Node && stripRef.current?.contains(e.target))) e.preventDefault();
    };
    document.addEventListener("touchmove", preventTouchScroll, { passive: false });
    return () => {
      body.style.paddingRight = previousBodyPaddingRight;
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  // Scroll lock on <html>, focus trap, Escape, and handing focus back to the opener; the arrow keys stay ours.
  useDialog(panelRef, onClose);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canCycle) return;
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCycle, onNext, onPrev]);

  React.useEffect(() => {
    closeRef.current?.focus();
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

  // Arrowing past the edge of the filmstrip drags the strip along, so the highlight never leaves view.
  React.useEffect(() => {
    const strip = stripRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  const control = "inline-flex items-center justify-center rounded-control text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none disabled:pointer-events-none disabled:opacity-40";

  return (
    <div ref={panelRef} tabIndex={-1} className="anim-fade fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-[rgba(13,16,23,.97)] text-white outline-none" role="dialog" aria-modal="true" aria-label={`Screenshots for ${title}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3 text-sm">
        <span className="tabular-nums" aria-live="polite">
          {index + 1} <span className="text-white/55">of {images.length}</span>
        </span>
        <span className="truncate text-center font-semibold">{title}</span>
        <button type="button" ref={closeRef} onClick={onClose} aria-label="Close" className={`${control} h-[38px] w-[38px] justify-self-end`}>
          <FiX size={22} />
        </button>
      </div>

      {/* The image's wrapper fills the stage (and the img ignores pointers), so close on clicks outside the picture's box. */}
      <div className="relative flex min-h-0 items-center justify-center px-4 py-2 md:px-[72px]" onClick={(e) => !overImage(e) && onClose()}>
        <PixelImage
          src={images[index]}
          alt={`${title} screenshot ${index + 1} of ${images.length}`}
          mode="contain"
          pixelPerfect={pixelPerfect}
          className="h-full w-full"
          imgClassName="rounded-frame"
        />
        {canCycle && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/[.08] text-white/80 transition-colors hover:bg-white/[.18] hover:text-white md:inline-flex"
            >
              <FiChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/[.08] text-white/80 transition-colors hover:bg-white/[.18] hover:text-white md:inline-flex"
            >
              <FiChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-2">
        <button
          type="button"
          role="switch"
          aria-checked={pixelPerfect}
          onClick={() => setPixelPerfect((v) => !v)}
          className="flex items-center gap-2 rounded-full px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
        >
          <FiGrid className="h-4 w-4" aria-hidden="true" />
          <span>Pixel-perfect</span>
          <span aria-hidden="true" className={`flex h-4 w-8 items-center rounded-full p-0.5 ring-1 ring-white/30 transition-colors ${pixelPerfect ? "bg-white/80" : "bg-white/10"}`}>
            <span className={`h-3 w-3 rounded-full transition-transform ${pixelPerfect ? "translate-x-4 bg-black/70" : "translate-x-0 bg-white/80"}`} />
          </span>
        </button>
        {canCycle && (
          <div className="flex w-full items-center gap-2 px-4 md:justify-center">
            <button type="button" aria-label="Previous image" onClick={onPrev} className={`${control} h-12 w-12 flex-none md:hidden`}>
              <FiChevronLeft className="h-7 w-7" />
            </button>
            {/* p-1 leaves room for the selected thumb's 2px ring, which the scroll container would clip.
                relative makes the thumbs' offsetLeft measure from the strip, which the centering below relies on. */}
            <div
              ref={stripRef}
              role="tablist"
              aria-label="Screenshots"
              onKeyDown={(e) => onTabListKeyDown(e, images.length, index, onChange)}
              className="relative flex min-w-0 flex-1 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] md:flex-none md:max-w-full">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  tabIndex={i === index ? 0 : -1}
                  aria-label={`Screenshot ${i + 1}`}
                  onClick={() => onChange(i)}
                  className={`flex-none overflow-hidden rounded-frame transition-[opacity,box-shadow] duration-[120ms] ${i === index ? "opacity-100 shadow-[0_0_0_2px_var(--rose)]" : "opacity-45 hover:opacity-85"}`}
                >
                  <img src={src} alt="" width={120} height={80} className="h-20 w-[120px] object-cover object-top" draggable={false} />
                </button>
              ))}
            </div>
            <button type="button" aria-label="Next image" onClick={onNext} className={`${control} h-12 w-12 flex-none md:hidden`}>
              <FiChevronRight className="h-7 w-7" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function overImage(e: React.MouseEvent<HTMLElement>) {
  const box = e.currentTarget.querySelector("img")?.getBoundingClientRect();
  return !!box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
}

"use client";

import React from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const MAX_ATTEMPTS = 3;

type PixelImageProps = {
  src: string;
  alt: string;
  mode?: "cover" | "contain"; // cover: fill and crop, contain: letterbox without cropping
  pixelPerfect?: boolean; // snap to integer scaling; rendering stays pixelated either way
  className?: string; // applied to wrapper
  imgClassName?: string; // applied to img
  style?: React.CSSProperties; // wrapper style
  onClick?: React.MouseEventHandler<HTMLDivElement>;
};

export default function PixelImage({
  src,
  alt,
  mode = "cover",
  pixelPerfect = true,
  className = "",
  imgClassName = "",
  style,
  onClick,
}: PixelImageProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [containerSize, setContainerSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [devicePixelRatioState, setDevicePixelRatioState] = React.useState<number>(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

  // Helper to check and set natural size from image
  const checkImageNaturalSize = React.useCallback((img: HTMLImageElement | null) => {
    if (!img) return false;
    const iw = img.naturalWidth || 0;
    const ih = img.naturalHeight || 0;
    if (iw > 0 && ih > 0) {
      setNaturalSize({ width: iw, height: ih });
      return true;
    }
    return false;
  }, []);

  // Helper to measure and update container size
  const measureContainer = React.useCallback(() => {
    if (!wrapperRef.current) return false;
    const cr = wrapperRef.current.getBoundingClientRect();
    const width = Math.max(0, cr.width);
    const height = Math.max(0, cr.height);

    // Only update if we have valid dimensions, or if this is the initial measurement
    setContainerSize((prev) => {
      if (width > 0 && height > 0) {
        return { width, height };
      } else if (prev.width === 0 && prev.height === 0) {
        // Allow setting to 0 if we haven't had dimensions yet (initial state)
        return { width, height };
      } else {
        // Preserve previous valid dimensions if we measured 0
        return prev;
      }
    });

    return width > 0 && height > 0;
  }, []);

  // Observe container size with ResizeObserver and measure after mount
  React.useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;

    const ro = new ResizeObserver(() => {
      const gotValidDimensions = measureContainer();

      // If ResizeObserver fired but we still don't have dimensions, retry after a delay
      // This handles the refresh case where ResizeObserver fires before layout is complete
      if (!gotValidDimensions) {
        setTimeout(() => {
          if (el) {
            const retryCr = el.getBoundingClientRect();
            if (retryCr.width > 0 && retryCr.height > 0) {
              measureContainer();
            } else {
              // Try one more time with another delay
              setTimeout(() => measureContainer(), 50);
            }
          }
        }, 50);
      }
    });
    ro.observe(el);

    // Measure immediately using requestAnimationFrame to catch layout as soon as it's ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Double RAF ensures we're after layout paint
        if (wrapperRef.current === el) {
          measureContainer();
        }
      });
    });

    // Also try with a small setTimeout as backup
    const timeout = setTimeout(() => {
      if (wrapperRef.current === el) {
        measureContainer();
      }
    }, 10);

    return () => {
      ro.disconnect();
      clearTimeout(timeout);
    };
  }, [measureContainer]);

  // Periodically check if image has loaded (fallback for cached images where onLoad might not fire properly)
  React.useEffect(() => {
    if (!imgRef.current || naturalSize.width > 0) return;

    let attempts = 0;
    const maxAttempts = 20;
    const checkInterval = setInterval(() => {
      attempts++;
      if (imgRef.current && checkImageNaturalSize(imgRef.current)) {
        clearInterval(checkInterval);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
      }
    }, 50);

    return () => clearInterval(checkInterval);
  }, [checkImageNaturalSize, naturalSize.width]);

  // Track DPR so we can snap scales to integer device-pixel multiples even under zoom
  React.useEffect(() => {
    const updateDpr = () => setDevicePixelRatioState(window.devicePixelRatio || 1);
    updateDpr();
    window.addEventListener("resize", updateDpr);
    window.addEventListener("orientationchange", updateDpr);
    // Some browsers support matchMedia for resolution changes
    let mm: MediaQueryList | null = null;
    try {
      mm = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const onChange = () => updateDpr();
      mm.addEventListener && mm.addEventListener("change", onChange);
    } catch {}
    return () => {
      window.removeEventListener("resize", updateDpr);
      window.removeEventListener("orientationchange", updateDpr);
      try {
        if (mm && (mm as any).removeEventListener) (mm as any).removeEventListener("change", updateDpr);
      } catch {}
    };
  }, []);

  // Determine scaling factor, snapping to whole pixels by default
  const scale = React.useMemo(() => {
    const iw = naturalSize.width;
    const ih = naturalSize.height;
    const cw = containerSize.width;
    const ch = containerSize.height;

    if (iw <= 0 || ih <= 0 || cw <= 0 || ch <= 0) return 1;

    const scaleX = cw / iw;
    const scaleY = ch / ih;
    const availableScale = mode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

    if (!pixelPerfect) return availableScale;

    if (mode === "cover") {
      // Snap UP to the nearest step to ensure we cover the container
      return Math.max(1, Math.ceil(availableScale));
    } else {
      // Snap DOWN to nearest step to avoid overflow
      return Math.max(1, Math.floor(availableScale));
    }
  }, [naturalSize, containerSize, mode, pixelPerfect, devicePixelRatioState]);

  const widthPx = naturalSize.width > 0 ? naturalSize.width * scale : undefined;
  const heightPx = naturalSize.height > 0 ? naturalSize.height * scale : undefined;

  // Check if we have both dimensions ready to prevent visual "pop"
  const isReady = naturalSize.width > 0 && naturalSize.height > 0 && containerSize.width > 0 && containerSize.height > 0;

  // Ref assignment - measure immediately when element is mounted
  const setRef = React.useCallback((el: HTMLDivElement | null) => {
    wrapperRef.current = el;
    if (el) {
      // Measure immediately using requestAnimationFrame to ensure layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Double RAF ensures we're after layout paint
          if (wrapperRef.current === el) {
            measureContainer();
          }
        });
      });
    }
  }, [measureContainer]);

  // Set image ref and check if already loaded (for cached images on refresh)
  const setImgRef = React.useCallback((img: HTMLImageElement | null) => {
    imgRef.current = img;
    if (img && img.complete) {
      checkImageNaturalSize(img);
    }
  }, [checkImageNaturalSize]);

  return (
    <div ref={setRef} className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`.trim()} style={style} onClick={onClick}>
      {/* Loading spinner */}
      {!isReady && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: isReady ? 0 : 1,
            transition: "opacity 0.2s",
            pointerEvents: "none",
          }}
        >
          <AiOutlineLoading3Quarters
            className="animate-spin color-[var(--foreground)] opacity-50"
            size={32}
            aria-label="Loading image"
          />
        </div>
      )}

      {/* We purposefully avoid Next/Image here to fully control integer scaling */}
      <img
        ref={setImgRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;

          // Function to check and set natural size, retrying if needed
          const checkAndSetNaturalSize = (attempt = 0) => {
            const iw = img.naturalWidth || 0;
            const ih = img.naturalHeight || 0;

            if (iw > 0 && ih > 0) {
              setNaturalSize({ width: iw, height: ih });
              // Re-check container size when image loads (handles cached images on refresh)
              setTimeout(() => {
                const gotValidDimensions = measureContainer();
                if (!gotValidDimensions) {
                  setTimeout(() => measureContainer(), 50);
                }
              }, 10);
            } else if (attempt < MAX_ATTEMPTS) {
              // Retry if natural dimensions aren't ready yet (can happen with cached images on refresh)
              setTimeout(() => checkAndSetNaturalSize(attempt + 1), 10 * (attempt + 1));
            } else {
              setNaturalSize({ width: 0, height: 0 });
            }
          };

          checkAndSetNaturalSize();
        }}
        width={naturalSize.width || undefined}
        height={naturalSize.height || undefined}
        className={`pointer-events-none select-none ${imgClassName}`.trim()}
        style={{
          width: widthPx,
          height: heightPx,
          maxWidth: "none",
          maxHeight: "none",
          aspectRatio: naturalSize.width > 0 && naturalSize.height > 0 ? `${naturalSize.width} / ${naturalSize.height}` : undefined,
          objectFit: "contain",
          imageRendering: "pixelated",
          opacity: isReady ? 1 : 0,
          transition: isReady ? "opacity 0.1s" : "none",
        }}
      />
    </div>
  );
}



"use client";

import React from "react";

type PixelImageProps = {
  src: string;
  alt: string;
  mode?: "cover" | "contain"; // cover: fill and crop, contain: letterbox without cropping
  className?: string; // applied to wrapper
  imgClassName?: string; // applied to img
  style?: React.CSSProperties; // wrapper style
  onClick?: React.MouseEventHandler<HTMLDivElement>;
};

export default function PixelImage({ src, alt, mode = "cover", className = "", imgClassName = "", style, onClick }: PixelImageProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [devicePixelRatioState, setDevicePixelRatioState] = React.useState<number>(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);

  // Observe container size
  React.useEffect(() => {
    if (!wrapperRef.current) return;
    const el = wrapperRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerSize({ width: Math.max(0, cr.width), height: Math.max(0, cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Determine integer scaling factor
  const scale = React.useMemo(() => {
    const iw = naturalSize.width;
    const ih = naturalSize.height;
    const cw = containerSize.width;
    const ch = containerSize.height;
    const dpr = devicePixelRatioState || 1;
    if (iw <= 0 || ih <= 0 || cw <= 0 || ch <= 0) return 1;
    const scaleX = cw / iw;
    const scaleY = ch / ih;
    const step = 1 / dpr; // CSS-px step that maps to 1 device pixel increment
    if (mode === "cover") {
      const required = Math.max(scaleX, scaleY);
      // Snap UP to the nearest step to ensure we cover the container
      return Math.max(step, Math.ceil(required * dpr) / dpr);
    }
    // contain
    const allowed = Math.min(scaleX, scaleY);
    // Snap DOWN to nearest step to avoid overflow
    return Math.max(step, Math.floor(allowed * dpr) / dpr);
  }, [naturalSize, containerSize, mode, devicePixelRatioState]);

  const widthPx = naturalSize.width > 0 ? naturalSize.width * scale : undefined;
  const heightPx = naturalSize.height > 0 ? naturalSize.height * scale : undefined;

  return (
    <div ref={wrapperRef} className={`relative overflow-hidden w-full h-full ${className}`.trim()} style={style} onClick={onClick}>
      {/* We purposefully avoid Next/Image here to fully control integer scaling */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          // Guard against zero values which can happen briefly
          const iw = img.naturalWidth || 0;
          const ih = img.naturalHeight || 0;
          setNaturalSize({ width: iw, height: ih });
        }}
        className={`pointer-events-none select-none ${imgClassName}`.trim()}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: widthPx ? `${widthPx}px` : undefined,
          height: heightPx ? `${heightPx}px` : undefined,
          maxWidth: "max-content",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}



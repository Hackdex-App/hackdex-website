"use client";

import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

interface SheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Sticky row under the content, usually the Save button. */
  footer?: React.ReactNode;
}

/**
 * Modal sheet: slides up from the bottom on phones and in from the right on
 * desktop. Locks page scroll, traps Tab, closes on Escape and scrim tap.
 */
export default function Sheet({ title, onClose, children, footer }: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  const titleId = React.useId();
  const [mounted, setMounted] = React.useState(false);
  const [inView, setInView] = React.useState(false);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const enter = requestAnimationFrame(() => requestAnimationFrame(() => setInView(true)));
    panelRef.current?.focus({ preventScroll: true });
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll<HTMLElement>("button, input, [href], select, textarea")].filter((el) => !el.hasAttribute("disabled"));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(enter);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden md:flex-row md:justify-end" role="presentation">
      <button type="button" className="anim-fade absolute inset-0 bg-[rgba(13,16,23,.4)]" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex h-[90%] max-h-[90%] min-h-0 flex-none flex-col overflow-hidden rounded-t-[20px] bg-surface text-text shadow-overlay outline-none transition-transform duration-[240ms] ease-[cubic-bezier(.2,.8,.2,1)] md:h-full md:max-h-full md:w-[440px] md:rounded-l-[20px] md:rounded-tr-none ${
          inView ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        }`}
      >
        <div className="flex flex-none justify-center pb-1 pt-2.5 md:hidden" aria-hidden>
          <span className="h-1 w-8 rounded-full bg-line-strong" />
        </div>
        <div className="flex flex-none items-center justify-between gap-2 border-b border-line py-2.5 pl-5 pr-3 md:pt-4">
          <h2 id={titleId} className="text-[17px] font-semibold">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="flex flex-none items-center justify-end gap-2 border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

"use client";

import React from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { useDialog } from "@/hooks/useDialog";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
  /** Panel width cap. Defaults to max-w-md. */
  className?: string;
}

/** Centered dialog for short tasks (confirmations, share, report). Closes on Escape and scrim tap. */
export default function Modal({ visible, ...props }: ModalProps) {
  if (!visible) return null;
  return <ModalPanel {...props} />;
}

function ModalPanel({ title, children, onClose, className = "max-w-md" }: Omit<ModalProps, "visible">) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  useDialog(panelRef, onClose);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button type="button" tabIndex={-1} className="anim-fade absolute inset-0 cursor-default bg-[rgba(13,16,23,.4)]" aria-label="Close" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`anim-pop relative max-h-[90dvh] w-full overflow-y-auto overscroll-contain rounded-frame border border-line bg-surface p-5 text-text shadow-overlay outline-none md:p-6 ${className}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="pt-1.5 text-[17px] font-semibold">
            {title}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="-mr-2 -mt-1 inline-flex h-10 w-10 flex-none items-center justify-center rounded-control text-text-2 hover:bg-surface-2 hover:text-text">
            <FiX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

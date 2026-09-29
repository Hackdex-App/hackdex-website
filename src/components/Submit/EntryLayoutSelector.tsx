"use client";

import React from "react";
import { usePageScrollLock } from "@/hooks/usePageScrollLock";

export type EntryLayout = "single" | "multi";

type EntryLayoutSelectorProps = {
  onSelect: (layout: EntryLayout) => void;
  onBack?: () => void;
};

const EntryLayoutSelector: React.FC<EntryLayoutSelectorProps> = ({ onSelect, onBack }) => {
  usePageScrollLock();

  return (
    <div className="fixed left-0 right-0 top-16 bottom-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose how this hack is patched"
        className="relative z-[101] mb-16 card backdrop-blur-lg dark:!bg-white/6 p-6 max-w-md max-h-[85vh] overflow-y-auto w-full rounded-lg"
      >
        <div className="flex flex-col gap-8 sm:gap-4">
          <div>
            <div className="text-xl font-semibold">How should this hack be patched?</div>
            <p className="mt-1 text-sm text-foreground/80">
              Most hacks use one source ROM and one patch. Choose the multi option if players can apply different patch files, or if the hack supports more than one base game.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onSelect("single")}
              className="shine-wrap btn-premium h-auto min-h-14 sm:min-h-11 w-full text-sm font-semibold rounded-md text-[var(--accent-foreground)] px-4 py-3"
            >
              <span className="flex flex-col items-center gap-0.5">
                <span>One base ROM, one patch</span>
                <span className="text-[11px] font-medium text-[var(--accent-foreground)]/80">The usual Hackdex flow</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSelect("multi")}
              className="inline-flex h-auto min-h-14 sm:min-h-11 w-full flex-col items-center justify-center rounded-md px-4 py-3 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
            >
              <span>Multiple base ROMs and patches</span>
              <span className="mt-0.5 text-[11px] font-medium text-foreground/65">Players pick which patch to apply</span>
            </button>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntryLayoutSelector;

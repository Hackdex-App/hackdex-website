"use client";

import React from "react";

interface PatchProgressBarProps {
  progress: number;
  visible: boolean;
  label?: string;
}

export default function PatchProgressBar({ progress, visible, label }: PatchProgressBarProps) {
  const barHeight = label ? 64 : 44;

  return (
    <>
      <div
        className="hidden overflow-hidden transition-all duration-300 ease-out md:block"
        style={{
          height: visible ? `${barHeight}px` : "0px",
        }}
      />

      <div
        className={`fixed inset-x-0 bottom-0 md:bottom-auto md:top-16 z-50 md:z-30 border-t md:border-t-0 md:border-b border-[var(--border)] bg-background/95 shadow-[0_-6px_24px_rgba(0,0,0,0.1)] md:shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full md:-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto max-w-screen-lg px-3 py-3">
          {label && (
            <p className="mb-2 text-xs font-medium text-foreground/80">
              {label}
            </p>
          )}
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-[var(--border)]">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      </div>
    </>
  );
}



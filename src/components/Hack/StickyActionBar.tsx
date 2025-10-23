"use client";

import React from "react";
import { platformAccept } from "@/utils/idb";
import type { Platform } from "@/data/baseRoms";

export default function StickyActionBar({ title, version, author, baseRomPlatform, onPatch, status, error, isLinked, romReady, onClickLink, supported, onUploadChange }: {
  title: string;
  version?: string;
  author: string;
  baseRomPlatform?: Platform;
  onPatch: () => void;
  status: "idle" | "ready" | "patching" | "done" | "downloading";
  error: string | null;
  isLinked: boolean;
  romReady: boolean;
  onClickLink: () => void;
  supported: boolean;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showError, setShowError] = React.useState(false);
  const [patchAgainReady, setPatchAgainReady] = React.useState(true);

  // Keep error mounted to allow fade-out when error becomes null
  React.useEffect(() => {
    let timeoutId: number | undefined;
    if (error) {
      setErrorMessage(error);
      // next frame to ensure transition runs
      requestAnimationFrame(() => setShowError(true));
    } else if (errorMessage !== null) {
      setShowError(false);
      timeoutId = window.setTimeout(() => setErrorMessage(null), 300);
    } else {
      setShowError(false);
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [error, errorMessage]);

  React.useEffect(() => {
    if (status === "done") {
      setPatchAgainReady(false);
      setTimeout(() => {
        setPatchAgainReady(true);
      }, 3000);
    } else {
      setPatchAgainReady(true);
    }
  }, [status]);

  return (
    <div className="sticky top-18 z-30 flex flex-col gap-2">
      <div className="mx-auto flex w-full lg:max-w-screen-lg items-center justify-between gap-4 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium">{title}</div>
            {version && (
              <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-foreground/85 ring-1 ring-[var(--border)]">{version}</span>
            )}
          </div>
          <div className="truncate text-xs text-foreground/60">By {author}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
            status === "downloading"
              ? "bg-[var(--surface-2)] text-foreground/85 ring-[var(--border)]"
              : romReady
              ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90"
              : isLinked
              ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90"
              : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"
          }`}>
            {status === "downloading" ? "Downloading..." : romReady ? "Ready" : isLinked ? "Permission needed" : "Base ROM needed"}
          </span>
          {!romReady && !isLinked && (
            <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
              <input ref={uploadInputRef} type="file" accept={platformAccept(baseRomPlatform)} onChange={onUploadChange} className="hidden" />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-foreground text-xs cursor-pointer hover:bg-[var(--surface-3)] hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Select Base ROM
              </button>
            </label>
          )}
          {!romReady && isLinked && (
            <button
              type="button"
              onClick={onClickLink}
              disabled={!supported}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs cursor-pointer hover:bg-[var(--surface-3)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Grant permission
            </button>
          )}
          <button
            onClick={onPatch}
            disabled={!mounted || (status !== "ready" && status !== "done") || !patchAgainReady}
            className="shine-wrap btn-premium h-9 min-w-[7.5rem] text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>{status === "patching" ? "Patching…" : (
              status === "done" ? (
                patchAgainReady ? "Patch Again" : "Patched"
              ) : "Patch Now"
            )}</span>
          </button>
        </div>
      </div>
      {errorMessage !== null && (
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 mx-auto flex lg:max-w-screen-lg rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)] text-sm text-red-400 transition-all duration-300 ${showError ? "opacity-100 translate-y-full" : "opacity-0 -translate-y-1/2 pointer-events-none"}`}
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}



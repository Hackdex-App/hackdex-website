"use client";

import React from "react";
import { platformAccept } from "@/utils/idb";
import type { Platform } from "@/data/baseRoms";

interface StickyActionBarProps {
  title: string;
  version?: string;
  author: string;
  filename: string | null;
  baseRomName?: string | null;
  baseRomPlatform?: Platform;
  onPatch: () => void;
  status: "idle" | "ready" | "patching" | "done" | "downloading";
  error: string | null;
  isLinked: boolean;
  romReady: boolean;
  onClickLink: () => void;
  supported: boolean;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function StickyActionBar({
  title,
  version,
  author,
  filename,
  baseRomName,
  baseRomPlatform,
  onPatch,
  status,
  error,
  isLinked,
  romReady,
  onClickLink,
  supported,
  onUploadChange,
}: StickyActionBarProps) {
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
    <div className="fixed inset-x-0 bottom-0 z-40 md:sticky md:top-18 md:z-30 flex flex-col gap-2 pb-safe">
      <div className="mx-auto w-full lg:max-w-screen-lg flex flex-col md:flex-row md:items-center md:justify-between md:gap-4 rounded-t-xl md:rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 pb-[env(safe-area-inset-bottom)] md:pb-3 shadow-[0_-6px_24px_rgba(0,0,0,0.2)] md:shadow-none backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_90%,transparent)] md:supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-xl font-bold md:text-sm md:font-medium">{title}</div>
            {version && (
              <span className="shrink-0 rounded-full bg-[var(--surface-2)] ml-auto md:ml-0 px-2 py-0.5 text-[11px] font-medium text-foreground/85 ring-1 ring-[var(--border)]">{version}</span>
            )}
          </div>
          <div className="truncate text-sm md:text-xs text-foreground/60">By {author}</div>
        </div>
        <div className="flex w-full md:w-auto flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-2 mb-4 md:mb-0">
          <span className={`rounded-full mx-auto md:mx-0 px-2 py-0.5 text-xs ring-1 ${
            status === "downloading"
              ? "bg-[var(--surface-2)] text-foreground/85 ring-[var(--border)]"
              : romReady
              ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90"
              : isLinked
              ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90"
              : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"
          }`}>
            {status === "downloading" ? "Downloading..." : romReady ? (filename ?? ".bps file ready") : isLinked ? "Permission needed" : "Base ROM needed"}
          </span>
          {!romReady && !isLinked && (
            <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
              <input ref={uploadInputRef} type="file" accept={platformAccept(baseRomPlatform)} onChange={onUploadChange} className="hidden" />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="w-5/6 mx-auto md:w-auto md:mx-0 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-foreground text-sm md:text-xs cursor-pointer hover:bg-[var(--surface-3)] hover:text-foreground/80 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {baseRomName ? (
                  <span>Select <span className="font-bold">{baseRomName}</span> ROM</span>
                ) : baseRomPlatform ? (
                  <span>Select <span className="font-bold">{baseRomPlatform}</span> ROM</span>
                ) : (
                  <span>Select Base ROM</span>
                )}
              </button>
            </label>
          )}
          {!romReady && isLinked && (
            <button
              type="button"
              onClick={onClickLink}
              disabled={!supported}
              className="w-5/6 md:w-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:text-xs cursor-pointer hover:bg-[var(--surface-3)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              Grant permission
            </button>
          )}
          <button
            onClick={onPatch}
            data-ready={romReady}
            disabled={!mounted || (status !== "ready" && status !== "done") || !patchAgainReady}
            className={`shine-wrap btn-premium max-md:data-[ready=false]:hidden! h-11 md:h-9 w-full md:w-auto md:min-w-[7.5rem] text-base md:text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${romReady && status !== 'downloading' && status !== 'ready' ? "mt-6 md:mt-0" : ""}`}
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
          className={`absolute inset-x-0 md:left-1/2 md:-translate-x-1/2 -top-2 mb-2 md:-bottom-2 md:mx-auto flex w-full md:w-auto lg:max-w-screen-lg rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)] text-sm text-red-400 transition-all duration-300 ${showError ? "opacity-100 -translate-y-full md:translate-y-full" : "opacity-0 translate-y-0 md:-translate-y-1/2 pointer-events-none"}`}
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}



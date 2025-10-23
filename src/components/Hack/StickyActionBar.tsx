"use client";

import React from "react";

export default function StickyActionBar({ title, version, author, onPatch, status, isLinked, ready, onClickLink, supported, onUploadChange }: {
  title: string;
  version?: string;
  author: string;
  onPatch: () => void;
  status: "idle" | "ready" | "patching" | "done" | "downloading";
  isLinked: boolean;
  ready: boolean;
  onClickLink: () => void;
  supported: boolean;
  onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDisabled = status === "patching" || (mounted && !ready && !isLinked && !supported);
  return (
    <div className="sticky top-18 z-30">
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
              : ready
              ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90"
              : isLinked
              ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90"
              : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"
          }`}>
            {status === "downloading" ? "Downloading..." : ready ? "Ready" : isLinked ? "Permission needed" : "Base ROM needed"}
          </span>
          {!ready && !isLinked && (
            <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
              <input type="file" onChange={onUploadChange} className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--border)]" />
              <span>Upload base ROM</span>
            </label>
          )}
          {!ready && isLinked && (
            <button
              type="button"
              onClick={onClickLink}
              disabled={!supported}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              Grant permission
            </button>
          )}
          <button
            onClick={onPatch}
            disabled={isDisabled}
            className="shine-wrap btn-premium h-9 min-w-[7.5rem] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span>{status === "patching" ? "Patching…" : status === "done" ? "Patched" : "Patch Now"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}



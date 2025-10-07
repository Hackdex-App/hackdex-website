import React from "react";

type Status = "granted" | "prompt" | "denied" | "error";

export default function BaseRomCard({
  name,
  platform,
  region,
  isLinked,
  status,
  isCached,
  onRemoveCache,
  onUnlink,
  onEnsurePermission,
  onImportCache,
}: {
  name: string;
  platform: "GB" | "GBC" | "GBA" | "NDS";
  region: string;
  isLinked: boolean;
  status: Status;
  isCached: boolean;
  onRemoveCache?: () => void;
  onUnlink?: () => void;
  onEnsurePermission?: () => void;
  onImportCache?: () => void;
}) {
  const ringAndBg = isCached
    ? "ring-emerald-400/40 bg-emerald-500/10"
    : isLinked
    ? status === "granted"
      ? "ring-emerald-400/40 bg-emerald-500/10"
      : status === "prompt"
      ? "ring-amber-400/40 bg-amber-500/10"
      : "ring-rose-400/40 bg-rose-500/10"
    : "card ring-[var(--border)]";

  const statusText = isCached
    ? "Cached copy available"
    : isLinked
    ? status === "granted"
      ? "Linked and ready"
      : status === "prompt"
      ? "Linked, permission required"
      : status === "denied"
      ? "Linked, permission denied"
      : "Link error"
    : "Not linked";

  const dotColor = isCached
    ? "bg-emerald-400"
    : isLinked
    ? status === "granted"
      ? "bg-emerald-400"
      : status === "prompt"
      ? "bg-amber-400"
      : "bg-rose-400"
    : "bg-white/30";

  return (
    <div className={`rounded-[12px] text-foreground p-4 ring-1 flex flex-col ${ringAndBg}`}>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 ring-1 ring-[var(--border)]">{platform}</span>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 ring-1 ring-[var(--border)]">{region}</span>
          </div>
          <div className="mt-2 text-[15px] font-semibold tracking-tight">{name}</div>
          <div className="mt-1 text-xs text-foreground/60">{statusText}</div>
        </div>
        <span className={`h-2 w-2 rounded-full ${dotColor}`} title={isLinked ? status : "Not linked"} />
      </div>

      {(isCached || isLinked) && (
        <div className="mt-4 flex min-h-[44px] items-center gap-2">
          {isCached ? (
            <button
              onClick={onRemoveCache}
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-400/30 bg-red-400/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-red-400/30"
            >
              Remove cache
            </button>
          ) : isLinked ? (
            <button
              onClick={onUnlink}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Unlink
            </button>
          ) : null}

          {!isCached && isLinked && status !== "granted" && (
            <button
              onClick={onEnsurePermission}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Re-authorize
            </button>
          )}

          {!isCached && isLinked && status === "granted" && (
            <button
              onClick={onImportCache}
              className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cache copy
            </button>
          )}
        </div>
      )}
    </div>
  );
}



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
  // Green means "on this device"; amber is a permission prompt; error is the separate orange-red.
  const ringAndBg = isCached
    ? "border-ready/40 bg-ready-soft/60"
    : isLinked
    ? status === "granted"
      ? "border-ready/40 bg-ready-soft/60"
      : status === "prompt"
      ? "border-warn/40 bg-warn-soft/60"
      : "border-error/40 bg-error-soft/60"
    : "border-line bg-surface";

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
    ? "bg-ready"
    : isLinked
    ? status === "granted"
      ? "bg-ready"
      : status === "prompt"
      ? "bg-warn"
      : "bg-error"
    : "bg-line-strong";

  return (
    <div className={`flex flex-col rounded-card border p-4 text-text shadow-rest ${ringAndBg}`}>
      <div className="flex flex-1 items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-text-2">
            <span className="plat-dot rounded-full bg-surface-2 px-2 py-0.5" data-platform={platform}>{platform}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5">{region}</span>
          </div>
          <div className="mt-2 text-[15px] font-semibold tracking-tight">{name}</div>
          <div className="mt-1 text-xs text-text-3">{statusText}</div>
        </div>
        <span className={`h-2 w-2 rounded-full ${dotColor}`} title={isLinked ? status : "Not linked"} />
      </div>

      {(isCached || isLinked) && (
        <div className="mt-4 flex min-h-[44px] items-center gap-2">
          {isCached ? (
            <button
              onClick={onRemoveCache}
              className="inline-flex h-9 items-center justify-center rounded-control border border-error/40 bg-surface px-3 text-sm font-medium text-error transition-colors hover:bg-error-soft"
            >
              Remove cache
            </button>
          ) : isLinked ? (
            <button
              onClick={onUnlink}
              className="inline-flex h-9 items-center justify-center rounded-control border border-line-strong bg-surface px-3 text-sm font-medium text-text transition-colors hover:border-text-3"
            >
              Unlink
            </button>
          ) : null}

          {!isCached && isLinked && status !== "granted" && (
            <button
              onClick={onEnsurePermission}
              className="inline-flex h-9 items-center justify-center rounded-control border border-line-strong bg-surface px-3 text-sm font-medium text-text transition-colors hover:border-text-3"
            >
              Re-authorize
            </button>
          )}

          {!isCached && isLinked && status === "granted" && (
            <button
              onClick={onImportCache}
              className="inline-flex h-9 items-center justify-center rounded-control border border-line-strong bg-surface px-3 text-sm font-medium text-text transition-colors hover:border-text-3"
            >
              Cache copy
            </button>
          )}
        </div>
      )}
    </div>
  );
}



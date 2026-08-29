"use client";

import React from "react";
import Link from "next/link";
import { FiChevronDown, FiX } from "react-icons/fi";
import { platformAccept } from "@/utils/idb";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import type { Platform } from "@/data/baseRoms";
import HackOnboardingGate from "@/components/Hack/Onboarding/HackOnboardingGate";

type OnboardingTarget = "version" | "selectRom" | "agree";

interface StickyActionBarProps {
  title: string;
  version?: string;
  selectablePatches?: { id: number; version: string }[];
  selectedPatchId?: number | null;
  onVersionChange?: (patchId: number) => void;
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
  termsAgreed: boolean;
  isVerifyingRom?: boolean;
  patchProgress?: number | null;
  onVersionPickerOpenChange?: (open: boolean) => void;
  /** Control the onboarding is pointing at. Dims the bar around it and lights it up. */
  onboardingHighlight?: OnboardingTarget | null;
  onboardingDimBar?: boolean;
  /** The beacon rides along with `onboardingHighlight`; set false to suppress it. */
  onboardingBeacon?: boolean;
  /** Renders the onboarding opt-in gate when both gate props are supplied. */
  onboardingGateLabel?: string | null;
  onOnboardingGateClick?: () => void;
}

export default function StickyActionBar({
  title,
  version,
  selectablePatches = [],
  selectedPatchId,
  onVersionChange,
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
  termsAgreed,
  isVerifyingRom = false,
  patchProgress = null,
  onVersionPickerOpenChange,
  onboardingHighlight = null,
  onboardingDimBar = false,
  onboardingBeacon = true,
  onboardingGateLabel = null,
  onOnboardingGateClick,
}: StickyActionBarProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const { loading: baseRomsLoading } = useBaseRoms();
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [showError, setShowError] = React.useState(false);
  const [patchAgainReady, setPatchAgainReady] = React.useState(true);
  const [versionPickerOpen, setVersionPickerOpen] = React.useState(false);
  const hasVersionPicker = selectablePatches.length > 1 && !!onVersionChange;
  const onboardingActive = onboardingDimBar || onboardingHighlight !== null;

  // Reported through a ref so an inline parent callback cannot loop the effect.
  const versionPickerOpenChange = React.useRef(onVersionPickerOpenChange);
  React.useEffect(() => {
    versionPickerOpenChange.current = onVersionPickerOpenChange;
  }, [onVersionPickerOpenChange]);
  React.useEffect(() => {
    versionPickerOpenChange.current?.(versionPickerOpen);
  }, [versionPickerOpen]);

  // Lifts the target above the dim layer and rings it with the spotlight.
  const isSpotlight = (target: OnboardingTarget) => onboardingHighlight === target;
  const spotlight = (target: OnboardingTarget) =>
    isSpotlight(target)
      ? " relative z-[2] outline-[3px] outline-offset-2 outline-[color-mix(in_oklab,var(--accent)_45%,transparent)]"
      : "";
  const spotlightAttr = (target: OnboardingTarget) =>
    isSpotlight(target) || undefined;

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

  const handleVersionSelect = (patchId: number, closeAfterSelect: boolean) => {
    onVersionChange?.(patchId);
    if (closeAfterSelect) {
      setVersionPickerOpen(false);
    }
  };

  // Mystery Dungeon-length titles (e.g. "Explorers of Sky") stay readable at text-sm.
  const compactSelectRomLabel = (baseRomName?.length ?? 0) >= 36;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 md:sticky md:top-18 flex flex-col gap-2 pb-safe ${
        // Raised above the coach scrim so the lit control stays reachable.
        onboardingActive ? "z-[60] md:z-[60]" : "z-40 md:z-30"
      }`}
    >
      {/* The error banner occupies the same edge as the gate, so it wins. */}
      {onboardingGateLabel && onOnboardingGateClick && errorMessage === null && (
        <HackOnboardingGate label={onboardingGateLabel} onClick={onOnboardingGateClick} />
      )}
      <div data-hack-action-bar className="relative mx-auto w-full lg:max-w-screen-lg flex flex-col md:flex-row md:items-center md:justify-between md:gap-4 rounded-t-xl md:rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 pb-[env(safe-area-inset-bottom)] md:pb-3 shadow-[0_-6px_24px_rgba(0,0,0,0.2)] md:shadow-none backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_90%,transparent)] md:supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)]">
        {onboardingDimBar && (
          <div
            aria-hidden
            className="absolute inset-0 z-[1] rounded-t-xl md:rounded-md bg-[#171717]/25 dark:bg-black/55"
          />
        )}
        <div className="md:w-fit md:max-w-[40%] lg:max-w-[45%]">
          <div className="flex items-center gap-2">
            <div className="truncate text-xl font-bold md:text-sm md:font-medium">{title}</div>
            {hasVersionPicker ? (
              <button
                type="button"
                aria-label="Patch version"
                aria-haspopup="dialog"
                aria-expanded={versionPickerOpen}
                data-onboarding-spotlight={spotlightAttr("version")}
                onClick={() => setVersionPickerOpen((open) => !open)}
                className={`relative shrink-0 max-w-44 ml-auto md:ml-0 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-foreground/90 shadow-sm cursor-pointer focus:outline-none md:hover:bg-[var(--surface-3)] md:focus:ring-2 md:focus:ring-[var(--accent)]${spotlight("version")}`}
              >
                <span className="truncate">{version}</span>
                {versionPickerOpen ? (
                  <FiX size={13} className="shrink-0 text-foreground/65" aria-hidden />
                ) : (
                  <FiChevronDown size={13} className="shrink-0 text-foreground/65" aria-hidden />
                )}
                {onboardingBeacon && onboardingHighlight === "version" && (
                  <OnboardingBeacon className="-top-[3px] -right-[3px]" />
                )}
              </button>
            ) : version && (
              <span className="shrink-0 rounded-full bg-[var(--surface-2)] ml-auto md:ml-0 px-2 py-0.5 text-[11px] font-medium text-foreground/85 ring-1 ring-[var(--border)]">{version}</span>
            )}
          </div>
          <div className="truncate text-sm md:text-xs text-foreground/60">By {author}</div>
        </div>
        {hasVersionPicker && versionPickerOpen && (
          <div className="relative z-[2] md:hidden mt-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground/55">Select version</div>
            </div>
            <VersionRadioList
              patches={selectablePatches}
              selectedPatchId={selectedPatchId}
              onSelect={(patchId) => handleVersionSelect(patchId, true)}
            />
          </div>
        )}
        <div className={`${hasVersionPicker && versionPickerOpen ? "hidden md:flex" : "flex"} w-full min-w-0 md:flex-1 md:justify-end flex-col md:flex-row items-stretch md:items-center gap-2 mb-4 md:mb-0`}>
          {!termsAgreed || status === "downloading" ? (
            baseRomsLoading ? (
              <p className="rounded-full mx-auto md:mx-0 px-2 py-6 md:py-0.5 text-base text-center md:text-right md:mr-1 md:text-balance font-bold">
                Loading base ROMs…
              </p>
            ) : !romReady ? (
              <p className="rounded-full mx-auto md:mx-0 px-2 py-0.5 text-xs text-center md:text-right md:text-balance">
                To patch this hack, you must select a <span className="font-bold">clean ROM</span> for the patcher to use.
              </p>
            ) : (
              <p className="rounded-full mx-auto md:mx-0 px-2 py-0.5 text-xs text-center md:text-right md:text-balance">
                By patching, you agree to the <Link href="/terms" target="_blank" className="underline">Terms of Service</Link>.
              </p>
            )
          ) : (
            <span className={`rounded-full mx-auto md:mx-0 px-2 py-0.5 text-xs ring-1 transition-opacity duration-300 ${
              romReady
                ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90"
                : isLinked
                ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90"
                : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"
            }`}>
              {romReady ? (filename ?? "patch file ready") : isLinked ? "Permission needed" : "Base ROM needed"}
            </span>
          )}
          {!baseRomsLoading && !romReady && !isLinked && (
            <label className="flex w-full min-w-0 max-w-full md:w-auto items-center justify-center md:justify-end">
              <input
                ref={uploadInputRef}
                type="file"
                accept={platformAccept(baseRomPlatform)}
                onChange={onUploadChange}
                disabled={isVerifyingRom}
                className="hidden"
              />
              {/* The button clips its own overflow for the shine sweep, so the
                  beacon rides on this wrapper instead. */}
              <span className="relative inline-flex w-5/6 max-w-full min-w-0 mx-auto md:w-auto md:mx-0">
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={isVerifyingRom}
                  data-onboarding-spotlight={spotlightAttr("selectRom")}
                  className={`shine-wrap btn-premium min-h-11 md:min-h-9 h-auto py-2 w-full max-w-full md:w-auto md:min-w-34 text-balance text-center font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70${spotlight("selectRom")} ${
                    compactSelectRomLabel ? "text-sm" : "text-base md:text-sm"
                  }`}
                >
                  {isVerifyingRom ? (
                    <span>Verifying…</span>
                  ) : baseRomName ? (
                    <span className="min-w-0 w-full">Select <span className="font-bold">{baseRomName}</span> ROM</span>
                  ) : baseRomPlatform ? (
                    <span className="min-w-0 w-full">Select <span className="font-bold">{baseRomPlatform}</span> ROM</span>
                  ) : (
                    <span>Select Base ROM</span>
                  )}
                </button>
                {onboardingBeacon && onboardingHighlight === "selectRom" && (
                  <OnboardingBeacon large className="-top-[3px] right-[2px]" />
                )}
              </span>
            </label>
          )}
          {!baseRomsLoading && !romReady && isLinked && (
            <button
              type="button"
              onClick={onClickLink}
              disabled={!supported}
              data-onboarding-spotlight={spotlightAttr("selectRom")}
              className={`relative w-5/6 md:w-auto rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm md:text-xs cursor-pointer hover:bg-[var(--surface-3)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60${spotlight("selectRom")}`}
            >
              Grant permission
              {onboardingBeacon && onboardingHighlight === "selectRom" && (
                <OnboardingBeacon large className="-top-[3px] -right-[3px]" />
              )}
            </button>
          )}
          {/* Wrapper owns the layout slot so the beacon can escape the button's
              overflow clip. Hiding it here keeps the flex gap collapsed. */}
          <span
            data-ready={romReady}
            className={`relative inline-flex data-[ready=false]:hidden! w-full md:w-auto ${romReady && status !== 'downloading' && status !== 'ready' && termsAgreed ? "mt-6 md:mt-0" : ""}`}
          >
            <button
              onClick={onPatch}
              data-onboarding-spotlight={spotlightAttr("agree")}
              disabled={!mounted || !romReady || (status !== "ready" && status !== "done" && status !== "idle") || !patchAgainReady}
              className={`shine-wrap btn-premium h-11 md:h-9 w-full md:min-w-46 ${!termsAgreed || status === 'downloading' ? "md:w-32" : "md:w-auto"} text-base md:text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70${spotlight("agree")}`}
            >
              <span>{
                status === "patching" ? (
                  patchProgress != null && patchProgress > 0
                    ? `Patching… (${(patchProgress / (1024 * 1024)).toFixed(0)} MB)`
                    : "Patching…"
                ) :
                status === "downloading" ? "Downloading…" :
                status === "done" ? (
                  patchAgainReady ? "Patch Again" : "Patched"
                ) : termsAgreed ? "Retry Patching" : "Agree and Patch"
              }</span>
            </button>
            {onboardingBeacon && onboardingHighlight === "agree" && (
              <OnboardingBeacon large className="-top-[3px] right-[2px]" />
            )}
          </span>
        </div>
      </div>
      {hasVersionPicker && versionPickerOpen && (
        <div className="fixed left-0 right-0 top-0 bottom-0 z-[100] hidden md:flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setVersionPickerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select which version to download"
            className="relative z-[101] card backdrop-blur-lg dark:!bg-black/70 p-6 max-w-md w-full rounded-lg"
          >
            <button
              type="button"
              onClick={() => setVersionPickerOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold mb-4 pr-8">Select which version to download</h2>
            <VersionRadioList
              patches={selectablePatches}
              selectedPatchId={selectedPatchId}
              onSelect={(patchId) => handleVersionSelect(patchId, false)}
            />
          </div>
        </div>
      )}
      {errorMessage !== null && (
        <div
          className={`absolute inset-x-0 md:left-1/2 md:-translate-x-1/2 md:mt-4 mb-2 md:mx-auto flex flex-col w-full md:w-auto lg:max-w-screen-lg rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_oklab,var(--background)_70%,transparent)] text-sm text-red-400 transition-all duration-300 ${showError ? "opacity-100 -translate-y-full md:translate-y-full" : "opacity-0 translate-y-0 md:-translate-y-1/2 pointer-events-none"}`}
          role="alert"
          aria-live="polite"
        >
          <p className="mb-2 text-center font-bold">{errorMessage}</p>
          <p className="text-xs">If the issue persists, try clearing your browser cache or using a different browser.</p>
        </div>
      )}
    </div>
  );
}

/** Rose onboarding beacon with a reduced-motion-safe halo. */
function OnboardingBeacon({ className, large = false }: { className: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={`onboarding-beacon ${large ? "onboarding-beacon-large" : ""} pointer-events-none absolute! block overflow-visible ${className}`}
    />
  );
}

function VersionRadioList({
  patches,
  selectedPatchId,
  onSelect,
}: {
  patches: { id: number; version: string }[];
  selectedPatchId?: number | null;
  onSelect: (patchId: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Patch version"
      className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
    >
      {patches.map((patch, index) => {
        const selected = selectedPatchId === patch.id;
        return (
          <button
            key={patch.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(patch.id)}
            className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm transition-colors md:py-2.5 ${
              selected
                ? "bg-[var(--accent)]/10 text-foreground"
                : "text-foreground/75 hover:bg-[var(--surface-3)]"
            } ${index > 0 ? "border-t border-[var(--border)]" : ""}`}
          >
            <span className="font-medium">{patch.version}</span>
            <span
              className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                selected ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
              aria-hidden
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}



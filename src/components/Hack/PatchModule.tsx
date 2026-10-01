"use client";

import React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiDownload, FiX } from "react-icons/fi";
import { platformAccept } from "@/utils/idb";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseGameLabel, type Platform } from "@/data/baseRoms";
import HackOnboardingGate from "@/components/Hack/Onboarding/HackOnboardingGate";
import { HEADER_COMPACT_ID } from "@/components/Header";

type OnboardingTarget = "version" | "selectRom" | "agree";
type Status = "idle" | "ready" | "patching" | "done" | "downloading";

interface PatchModuleProps {
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
  status: Status;
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
  /** Control the onboarding is pointing at. Dims the module around it and lights it up. */
  onboardingHighlight?: OnboardingTarget | null;
  onboardingDimBar?: boolean;
  onboardingBeacon?: boolean;
  onboardingGateLabel?: string | null;
  /** The tour is open: the in-module entry point stays (inactive) so nothing shifts; the floating ones go. */
  onboardingGateHidden?: boolean;
  onOnboardingGateClick?: () => void;
}

/** Patch file format from its extension, for the facts list. */
function patchFormat(filename: string | null) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  return ext && ["bps", "ips", "ups", "xdelta"].includes(ext) ? ext.toUpperCase() : null;
}

/** True once `el` has scrolled up behind the sticky site header. */
function useScrolledBehindHeader(ref: React.RefObject<HTMLElement | null>) {
  const [out, setOut] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0;
        setOut(!entry.isIntersecting && entry.boundingClientRect.bottom <= rootTop);
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return out;
}

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/** Swallows wheel, touch, and key scrolling until the returned release is called. */
function holdUserScroll() {
  const block = (event: Event) => event.preventDefault();
  const blockKeys = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) event.preventDefault();
  };
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("keydown", blockKeys);
  return () => {
    window.removeEventListener("wheel", block);
    window.removeEventListener("touchmove", block);
    window.removeEventListener("keydown", blockKeys);
  };
}

/**
 * Patch module: status line, version, the one action, and the facts a player
 * checks before trusting a download. Lives at the top of the hack page rail.
 * Once the action button scrolls behind the site header the title, version
 * picker, and the same action reappear in a compact bar there, so patching is
 * never far away.
 */
export default function PatchModule({
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
  onboardingGateHidden = false,
  onOnboardingGateClick,
}: PatchModuleProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const { loading: baseRomsLoading } = useBaseRoms();
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const moduleRef = React.useRef<HTMLDivElement | null>(null);
  const actionRef = React.useRef<HTMLDivElement | null>(null);
  const scrolledOut = useScrolledBehindHeader(actionRef);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [patchAgainReady, setPatchAgainReady] = React.useState(true);
  // Which copy of the picker is open: the module's or the compact bar's. Sharing one flag opened both,
  // and the hidden one's outside-click handler closed the menu before an option could be picked.
  const [versionPickerOpenIn, setVersionPickerOpenIn] = React.useState<"module" | "compact" | null>(null);
  const versionPickerOpen = versionPickerOpenIn !== null;
  const hasVersionPicker = selectablePatches.length > 1 && !!onVersionChange;
  const base = baseRomName ? baseGameLabel(baseRomName) : baseRomPlatform ?? "base";
  const format = patchFormat(filename);

  const versionPickerOpenChange = React.useRef(onVersionPickerOpenChange);
  React.useEffect(() => {
    versionPickerOpenChange.current = onVersionPickerOpenChange;
  }, [onVersionPickerOpenChange]);
  React.useEffect(() => {
    versionPickerOpenChange.current?.(versionPickerOpen);
  }, [versionPickerOpen]);

  React.useEffect(() => {
    let timeoutId: number | undefined;
    if (error) setErrorMessage(error);
    else if (errorMessage !== null) timeoutId = window.setTimeout(() => setErrorMessage(null), 300);
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [error, errorMessage]);

  React.useEffect(() => {
    if (status !== "done") {
      setPatchAgainReady(true);
      return;
    }
    setPatchAgainReady(false);
    const t = window.setTimeout(() => setPatchAgainReady(true), 3000);
    return () => window.clearTimeout(t);
  }, [status]);

  const isSpotlight = (target: OnboardingTarget) => onboardingHighlight === target;
  const spotlight = (target: OnboardingTarget) =>
    isSpotlight(target) ? " relative z-[2] outline-[3px] outline-offset-2 outline-[color-mix(in_oklab,var(--rose)_45%,transparent)]" : "";
  const spotlightAttr = (target: OnboardingTarget) => isSpotlight(target) || undefined;
  const onboardingActive = onboardingDimBar || onboardingHighlight !== null;

  // ---- the state the player sees ----
  const kind: "loading" | "needs-rom" | "permission" | "ready" | "patching" | "downloading" | "done" = baseRomsLoading
    ? "loading"
    : !romReady
      ? isLinked
        ? "permission"
        : "needs-rom"
      : status === "patching"
        ? "patching"
        : status === "downloading"
          ? "downloading"
          : status === "done"
            ? "done"
            : "ready";
  const tone = errorMessage ? "error" : kind === "ready" || kind === "done" || kind === "patching" || kind === "downloading" ? "ready" : "neutral";
  const busy = kind === "patching" || kind === "downloading";

  const actionLabel = (() => {
    switch (kind) {
      case "loading":
        return "Checking your ROMs…";
      case "needs-rom":
        return isVerifyingRom ? "Verifying…" : `Select ${base} ROM`;
      case "permission":
        return "Grant permission";
      case "patching":
        return patchProgress != null && patchProgress > 0 ? `Patching… (${(patchProgress / (1024 * 1024)).toFixed(0)} MB)` : "Patching…";
      case "downloading":
        return "Downloading…";
      case "done":
        return patchAgainReady ? "Patch again" : "Patched";
      case "ready":
        return termsAgreed ? "Retry patching" : "Agree and patch";
    }
  })();

  function ActionButton({ compact = false }: { compact?: boolean }) {
    const shape = compact ? "h-10 w-full px-4 text-sm md:w-auto" : "h-12 w-full px-5 text-[15px]";
    const paint =
      kind === "done" && !patchAgainReady
        ? "bg-ready text-on-ready"
        : busy
          ? "bg-accent-hover text-white"
          : "bg-accent-deep text-white hover:enabled:bg-accent-hover";
    const cls = `relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-control font-semibold transition-[background-color,transform] duration-[120ms] active:enabled:scale-[.98] disabled:cursor-default ${shape} ${paint}`;

    if (kind === "needs-rom") {
      return (
        <span className={`relative inline-flex w-full ${compact ? "md:w-auto" : ""}`}>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isVerifyingRom}
            data-onboarding-spotlight={compact ? undefined : spotlightAttr("selectRom")}
            className={`${cls} disabled:opacity-70${compact ? "" : spotlight("selectRom")}`}
          >
            {actionLabel}
          </button>
          {!compact && onboardingBeacon && isSpotlight("selectRom") && <OnboardingBeacon large className="-top-[3px] right-[2px]" />}
        </span>
      );
    }
    if (kind === "permission") {
      return (
        <span className={`relative inline-flex w-full ${compact ? "md:w-auto" : ""}`}>
          <button
            type="button"
            onClick={onClickLink}
            disabled={!supported}
            data-onboarding-spotlight={compact ? undefined : spotlightAttr("selectRom")}
            className={`${cls} disabled:opacity-60${compact ? "" : spotlight("selectRom")}`}
          >
            {actionLabel}
          </button>
          {!compact && onboardingBeacon && isSpotlight("selectRom") && <OnboardingBeacon large className="-top-[3px] -right-[3px]" />}
        </span>
      );
    }
    const disabled = !mounted || kind === "loading" || busy || !patchAgainReady;
    return (
      <span className={`relative inline-flex w-full ${compact ? "md:w-auto" : ""}`}>
        <button
          type="button"
          onClick={onPatch}
          disabled={disabled}
          aria-live="polite"
          data-onboarding-spotlight={compact ? undefined : spotlightAttr("agree")}
          className={`${cls}${kind === "loading" ? " opacity-70" : ""}${compact ? "" : spotlight("agree")}`}
        >
          {busy && <span className="absolute inset-y-0 left-0 w-1/3 animate-[progressSweep_1.2s_ease-in-out_infinite] bg-white/15" aria-hidden />}
          <span className="relative inline-flex items-center gap-2">
            {kind === "done" && !patchAgainReady ? <FiCheck className="h-5 w-5" /> : kind === "ready" ? <FiDownload className="h-5 w-5" /> : null}
            {actionLabel}
          </span>
        </button>
        {!compact && onboardingBeacon && isSpotlight("agree") && <OnboardingBeacon large className="-top-[3px] right-[2px]" />}
      </span>
    );
  }

  const picker = (where: "module" | "compact") => hasVersionPicker && (
    <VersionPicker
      version={version}
      patches={selectablePatches}
      selectedPatchId={selectedPatchId}
      open={versionPickerOpenIn === where}
      onOpenChange={(open) => setVersionPickerOpenIn(open ? where : null)}
      onSelect={(id) => {
        onVersionChange?.(id);
        setVersionPickerOpenIn(null);
      }}
      spotlight={spotlight("version")}
      spotlightAttr={spotlightAttr("version")}
      beacon={onboardingBeacon && isSpotlight("version")}
    />
  );

  const termsLine = kind === "ready" || kind === "done" ? (
    <>
      Patching means you agree to the{" "}
      <Link href="/terms" prefetch={false} target="_blank" className="underline underline-offset-2">
        terms
      </Link>
      .
    </>
  ) : (
    "Your ROM stays in your browser. Hackdex never receives it."
  );

  const compactTarget = mounted && scrolledOut ? document.getElementById(HEADER_COMPACT_ID) : null;

  // The help entry point shows wherever the action is: in the module, beside the
  // compact action on desktop, and as a floating pill on phones. Every home first
  // brings the module to a fixed spot under the header, since the tour spotlights
  // the full-size controls and anchors its card to the module.
  const gate = onboardingGateLabel && onOnboardingGateClick && errorMessage === null && !busy
    ? {
        label: onboardingGateLabel,
        beacon: kind === "needs-rom",
        open: () => {
          const el = moduleRef.current;
          if (!el) return onOnboardingGateClick();
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const top = Math.max(0, window.scrollY + el.getBoundingClientRect().top - 80);
          window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
          // The tour locks body scroll once open, which would freeze a smooth
          // scroll midway, so hold the user's own scrolling until the page has
          // settled at the target, then open.
          const release = holdUserScroll();
          const started = performance.now();
          const settle = () => {
            if (Math.abs(window.scrollY - top) < 2 || performance.now() - started > 1000) {
              release();
              onOnboardingGateClick();
            } else requestAnimationFrame(settle);
          };
          requestAnimationFrame(settle);
        },
      }
    : null;

  return (
    <div ref={moduleRef} className={`relative ${onboardingActive ? "z-[60]" : ""}`}>
      <input ref={uploadInputRef} type="file" accept={platformAccept(baseRomPlatform)} onChange={onUploadChange} disabled={isVerifyingRom} className="hidden" />
      <div data-hack-action-bar className="relative flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-rest">
        {onboardingDimBar && <div aria-hidden className="absolute inset-0 z-[1] rounded-card bg-[#171717]/25 dark:bg-black/55" />}

        <div
          className={`rounded-control px-3.5 py-3 text-sm transition-colors duration-[220ms] ${
            tone === "error" ? "bg-error-soft" : tone === "ready" ? "bg-ready-soft" : "bg-surface-2"
          }`}
          role={tone === "error" ? "alert" : undefined}
          aria-live="polite"
        >
          {errorMessage ? (
            <p>
              <b className="font-semibold text-error">{errorMessage}</b> If the issue persists, try clearing your browser cache or using a different browser.
            </p>
          ) : kind === "loading" ? (
            <p>
              <b className="font-semibold">Checking this device for your {base} ROM.</b>
            </p>
          ) : kind === "needs-rom" ? (
            <p>
              <b className="font-semibold">Needs your {base} ROM.</b> You bring the ROM; we apply {author}&rsquo;s patch to it in your browser. Nothing gets downloaded that {author} didn&rsquo;t make.
            </p>
          ) : kind === "permission" ? (
            <p>
              <b className="font-semibold">{base} ROM linked.</b> Grant permission so the patcher can read it. It never leaves your browser.
            </p>
          ) : kind === "patching" ? (
            <p>
              <b className="font-semibold">Patching {base}.</b> Applying the patch in your browser. Keep this tab open.
            </p>
          ) : kind === "downloading" ? (
            <p>
              <b className="font-semibold">Almost done.</b> The patched ROM is on its way to your downloads.
            </p>
          ) : kind === "done" ? (
            <p>
              <b className="font-semibold">Done.</b> The patched ROM is in your downloads. Load it in any {baseRomPlatform ?? ""} emulator.
            </p>
          ) : (
            <p>
              <b className="font-semibold">{base} ROM ready.</b> Linked on this device; it never leaves your browser.
            </p>
          )}
        </div>

        <div ref={actionRef}>
          <ActionButton />
        </div>
        {gate && <HackOnboardingGate variant="row" label={gate.label} onClick={gate.open} beacon={gate.beacon && !onboardingGateHidden} inactive={onboardingGateHidden} />}

        <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px] leading-[1.45]">
          <dt className={`text-text-3 ${hasVersionPicker ? "self-center" : ""}`}>Version</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-2 text-text-2">{hasVersionPicker ? picker("module") : <span className="font-medium text-text">{version}</span>}</dd>
          <dt className="text-text-3">Patch</dt>
          <dd className="text-text-2">{format ? `${format} file` : "Patch file"}, applied locally</dd>
          <dt className="text-text-3">Needs</dt>
          <dd className="text-text-2">A clean {baseRomName ?? base} ROM. We verify the checksum first.</dd>
        </dl>

        <p className="text-xs text-text-3">{termsLine}</p>
      </div>

      {compactTarget &&
        createPortal(
          <div className="anim-fade flex items-center gap-3 bg-surface px-6 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-2 max-md:border-b max-md:border-line max-md:py-2 max-md:shadow-lift md:h-full md:gap-4 md:border-l md:border-line md:px-5">
            <strong className="min-w-0 flex-1 text-[15px] font-semibold leading-tight max-md:line-clamp-2 md:truncate md:text-base">{title}</strong>
            <div className="flex items-center gap-3 max-md:flex-[1_1_100%] max-md:flex-col-reverse max-md:items-stretch max-md:gap-1.5">
              {kind === "ready" && (
                <small className="text-xs text-text-3 max-md:text-center md:max-w-[220px] md:text-right md:max-lg:hidden">
                  By patching, you agree to the{" "}
                  <Link href="/terms" prefetch={false} target="_blank" className="underline underline-offset-2">
                    terms
                  </Link>
                  .
                </small>
              )}
              <div className="flex items-center gap-2 max-md:w-full">
                {gate && !onboardingGateHidden && (
                  <div className="hidden md:block">
                    <HackOnboardingGate variant="icon" label={gate.label} onClick={gate.open} beacon={gate.beacon} />
                  </div>
                )}
                {hasVersionPicker && (
                  <div className="max-md:flex-none">
                    {picker("compact")}
                  </div>
                )}
                <ActionButton compact />
              </div>
            </div>
          </div>,
          compactTarget,
        )}
      {compactTarget && gate && !onboardingGateHidden && createPortal(<HackOnboardingGate variant="pill" label={gate.label} onClick={gate.open} beacon={gate.beacon} />, document.body)}
    </div>
  );
}

/** Rose onboarding beacon with a reduced-motion-safe halo. */
function OnboardingBeacon({ className, large = false }: { className: string; large?: boolean }) {
  return <span aria-hidden className={`onboarding-beacon ${large ? "onboarding-beacon-large" : ""} pointer-events-none absolute! block overflow-visible ${className}`} />;
}

/** Version chip that opens a list of the patches a player may choose from. Closes on outside click or Escape. */
function VersionPicker({
  version,
  patches,
  selectedPatchId,
  open,
  onOpenChange,
  onSelect,
  spotlight,
  spotlightAttr,
  beacon,
}: {
  version?: string;
  patches: { id: number; version: string }[];
  selectedPatchId?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: number) => void;
  spotlight: string;
  spotlightAttr: true | undefined;
  beacon: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  // Opens upward when the phone tab bar or the viewport edge would cover it and there is more room above.
  const [up, setUp] = React.useState(false);
  React.useLayoutEffect(() => {
    if (!open || !rootRef.current || !listRef.current) return setUp(false);
    const chip = rootRef.current.getBoundingClientRect();
    const tabs = document.getElementById("mobile-tabs")?.offsetHeight ?? 0;
    const below = window.innerHeight - tabs - chip.bottom;
    setUp(below < listRef.current.offsetHeight + 8 && chip.top > below);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Patch version"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-onboarding-spotlight={spotlightAttr}
        onClick={() => onOpenChange(!open)}
        className={`inline-flex h-8 max-w-44 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 text-[12px] font-semibold text-text transition-colors hover:border-text-3${spotlight}`}
      >
        <span className="truncate">{version}</span>
        {open ? <FiX size={13} className="shrink-0 text-text-3" aria-hidden /> : <FiChevronDown size={13} className="shrink-0 text-text-3" aria-hidden />}
      </button>
      {beacon && <OnboardingBeacon className="-top-[3px] -right-[3px]" />}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Patch version"
          className={`anim-pop absolute left-0 z-30 w-60 overflow-hidden rounded-card border border-line bg-surface shadow-overlay ${up ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {patches.map((patch, index) => {
            const selected = selectedPatchId === patch.id;
            return (
              <button
                key={patch.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(patch.id)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                  selected ? "bg-accent-soft/60 text-text" : "text-text-2 hover:bg-surface-2"
                } ${index > 0 ? "border-t border-line" : ""}`}
              >
                <span className="font-medium">{patch.version}</span>
                {selected && <FiCheck className="h-4 w-4 text-accent-text" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

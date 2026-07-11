"use client";

import React, { useEffect, useRef, useState } from "react";
import { updatePatchesDownloadPermission } from "@/app/hack/[slug]/actions";
import type { Database } from "@/types/db";
import CollapsibleCard from "@/components/Primitives/CollapsibleCard";
import { FaUserGear } from "react-icons/fa6";

export type PatchesDownloadPermission = Database["public"]["Enums"]["Patches Download Permission"];

function patchDownloadOptionDescription(
  value: PatchesDownloadPermission,
  isCustomPatcherActive: boolean,
): string {
  switch (value) {
    case "None":
      return "Users can only download your hack through the built-in patcher.";
    case "Current":
      return isCustomPatcherActive
        ? "Only patch versions in your Custom patcher list can be downloaded directly."
        : "Only the patch version marked Current can be downloaded directly.";
    case "All":
      return "Every published patch version can be downloaded directly.";
  }
}

export const PATCH_DOWNLOAD_OPTIONS: {
  value: PatchesDownloadPermission;
  label: string;
}[] = [
  { value: "None", label: "None" },
  { value: "Current", label: "Current only" },
  { value: "All", label: "All published" },
];

function optionLabel(value: PatchesDownloadPermission): string {
  return PATCH_DOWNLOAD_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

interface DownloadPermissionSettingsProps {
  hackSlug: string;
  initialPermission: PatchesDownloadPermission;
  isCustomPatcherActive?: boolean;
}

export default function DownloadPermissionSettings({
  hackSlug,
  initialPermission,
  isCustomPatcherActive = false,
}: DownloadPermissionSettingsProps) {
  const [savedPermission, setSavedPermission] = useState<PatchesDownloadPermission>(initialPermission);
  const [selectedPermission, setSelectedPermission] = useState<PatchesDownloadPermission>(initialPermission);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedFadeOut, setSavedFadeOut] = useState(false);
  const savedTimersRef = useRef<{
    hold?: ReturnType<typeof setTimeout>;
    fade?: ReturnType<typeof setTimeout>;
  }>({});

  function clearSavedFeedbackTimers() {
    const t = savedTimersRef.current;
    if (t.hold) clearTimeout(t.hold);
    if (t.fade) clearTimeout(t.fade);
    t.hold = undefined;
    t.fade = undefined;
  }

  useEffect(() => {
    setSavedPermission(initialPermission);
    setSelectedPermission(initialPermission);
  }, [initialPermission]);

  useEffect(() => {
    return () => {
      clearSavedFeedbackTimers();
    };
  }, []);

  const hasUnsavedChanges = selectedPermission !== savedPermission;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updatePatchesDownloadPermission(hackSlug, selectedPermission);
      if (result.ok) {
        setSavedPermission(selectedPermission);
        clearSavedFeedbackTimers();
        setSavedFadeOut(false);
        setShowSaved(true);
        const HOLD_MS = 4000;
        const FADE_MS = 450;
        savedTimersRef.current.hold = setTimeout(() => {
          setSavedFadeOut(true);
          savedTimersRef.current.fade = setTimeout(() => {
            setShowSaved(false);
            setSavedFadeOut(false);
          }, FADE_MS);
        }, HOLD_MS);
      } else {
        setError(result.error || "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const summary = (
    <>
      <span className="text-foreground/45">Live: </span>
      <span className="text-foreground/80 font-medium">{optionLabel(savedPermission)}</span>
      {hasUnsavedChanges && (
        <>
          <span className="text-foreground/40"> · Draft: </span>
          <span className="text-foreground/70 font-medium">{optionLabel(selectedPermission)}</span>
        </>
      )}
    </>
  );

  return (
    <CollapsibleCard
      title="Patch Download Settings"
      titleId="patch-download-permissions-heading"
      leading={<FaUserGear size={20} />}
      summary={summary}
      className="mb-6 rounded-lg border border-[var(--border)]/70 border-l-[3px] border-l-[var(--accent)]/40 bg-[var(--surface-2)]"
    >
      <div>
        <p className="text-xs sm:text-sm text-foreground/60 leading-snug md:-mt-4 mb-6">
          Changing this setting will allow users to download the patch file directly from this page as an alternative to using the built-in patcher.
          {isCustomPatcherActive && (
            <> With <strong className="font-medium text-foreground/70">Custom</strong> patcher versions active, "Current only" applies to every version in your Custom patcher list—not the Current badge alone.</>
          )}
        </p>
        <RadioCardsBody
          selectedPermission={selectedPermission}
          savedPermission={savedPermission}
          isCustomPatcherActive={isCustomPatcherActive}
          onSelect={setSelectedPermission}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center justify-center min-w-20 h-8 px-3 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)] shrink-0"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <div
            className="text-xs min-h-[1.25rem] flex items-center flex-1 min-w-0"
            aria-live="polite"
          >
            {showSaved ? (
              <span
                className={`text-emerald-600 dark:text-emerald-400 font-medium transition-opacity duration-[450ms] ease-out ${
                  savedFadeOut ? "opacity-0" : "opacity-100"
                }`}
              >
                Setting updated.
              </span>
            ) : error ? (
              <span className="text-red-400">{error}</span>
            ) : null}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}

function RadioCardsBody({
  selectedPermission,
  savedPermission,
  isCustomPatcherActive,
  onSelect,
}: {
  selectedPermission: PatchesDownloadPermission;
  savedPermission: PatchesDownloadPermission;
  isCustomPatcherActive: boolean;
  onSelect: (v: PatchesDownloadPermission) => void;
}) {
  const dirty = selectedPermission !== savedPermission;

  return (
    <div className="flex flex-col gap-1.5 sm:gap-1" role="radiogroup" aria-label="Who can download patch files">
      {PATCH_DOWNLOAD_OPTIONS.map((opt) => {
        const isUiSelected = selectedPermission === opt.value;
        const showSavedBadge = savedPermission === opt.value && dirty;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isUiSelected}
            onClick={() => onSelect(opt.value)}
            className={`w-full text-left rounded-md border-2 px-3 py-2.5 sm:px-2 sm:py-1.5 transition-colors flex gap-3 sm:gap-2 items-center touch-manipulation min-h-[2.75rem] sm:min-h-[2.25rem] ${
              isUiSelected
                ? "border-[var(--accent)] bg-[var(--surface-2)]"
                : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)]"
            }`}
          >
            <span
              className={`shrink-0 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                isUiSelected ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
              aria-hidden
            >
              {isUiSelected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
            </span>
            <span className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:gap-x-1.5 sm:gap-y-0 leading-tight">
              <span className="text-sm font-semibold sm:text-xs">{opt.label}</span>
              <span className="text-xs text-foreground/55 sm:text-[11px]">
                {patchDownloadOptionDescription(opt.value, isCustomPatcherActive)}
              </span>
              {showSavedBadge && (
                <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide text-foreground/60 bg-foreground/5 ring-1 ring-[var(--border)]">
                  Saved
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

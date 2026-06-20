"use client";

import React from "react";
import { FaCode } from "react-icons/fa";
import CollapsibleCard from "@/components/Primitives/CollapsibleCard";

type PatcherOption = "latest" | "custom";

interface PatcherVersionSettingsProps {
  publishedOption: PatcherOption;
  draftOption: PatcherOption;
  latestVersionLabels: string[];
  liveVersionLabels: string[];
  draftVersionLabels: string[];
  customSelectionCount: number;
  selectionMode: boolean;
  hasUnsavedChanges: boolean;
  publishDisabled: boolean;
  saving: boolean;
  error: string | null;
  showSaved: boolean;
  savedFadeOut: boolean;
  onChooseOption: (option: PatcherOption) => void;
  onEnterSelectionMode: () => void;
  onClearSelections: () => void;
  onCancel: () => void;
  onPublish: () => void;
}

function optionLabel(option: PatcherOption) {
  return option === "latest" ? "Latest published patch" : "Custom";
}

function versionSummary(labels: string[], emptyLabel: string) {
  if (labels.length === 0) return emptyLabel;
  return labels.join(", ");
}

export default function PatcherVersionSettings({
  publishedOption,
  draftOption,
  latestVersionLabels,
  liveVersionLabels,
  draftVersionLabels,
  customSelectionCount,
  selectionMode,
  hasUnsavedChanges,
  publishDisabled,
  saving,
  error,
  showSaved,
  savedFadeOut,
  onChooseOption,
  onEnterSelectionMode,
  onClearSelections,
  onCancel,
  onPublish,
}: PatcherVersionSettingsProps) {
  const isSwitchingFromLatestToCustom = publishedOption === "latest" && draftOption === "custom";
  const summaryStatus = (() => {
    if (hasUnsavedChanges && draftOption !== publishedOption) {
      return { prefix: " · Draft: ", label: optionLabel(draftOption) };
    }
    if (hasUnsavedChanges) {
      return { prefix: " · ", label: "Unsaved changes" };
    }
    if (selectionMode) {
      return { prefix: " · ", label: "Selecting versions" };
    }
    return null;
  })();
  const summary = (
    <>
      <span className="text-foreground/45">Live: </span>
      <span className="text-foreground/80 font-medium">{optionLabel(publishedOption)}</span>
      {summaryStatus && (
        <>
          <span className="text-foreground/40">{summaryStatus.prefix}</span>
          <span className="text-foreground/70 font-medium">{summaryStatus.label}</span>
        </>
      )}
    </>
  );

  return (
    <CollapsibleCard
      title="Patcher Version Settings"
      titleId="patcher-version-settings-heading"
      leading={<FaCode size={20} />}
      summary={summary}
      className="mb-6 rounded-lg border border-[var(--border)]/70 border-l-[3px] border-l-[var(--accent)]/40 bg-[var(--surface-2)]"
    >
      <div>
        <p className="text-xs sm:text-sm text-foreground/60 leading-snug md:-mt-4 mb-6">
          Choose which patch versions players can use from the downloader on your hack&apos;s homepage.
        </p>
        <div className="grid gap-3" role="radiogroup" aria-label="Patcher version source">
          <OptionCard
            option="latest"
            selected={draftOption === "latest"}
            saved={publishedOption === "latest"}
            label="Only use the latest published patch"
            description="Use the hack's current published patch. Players will not see a version dropdown."
            detail={versionSummary(latestVersionLabels, "No current patch is set.")}
            onSelect={onChooseOption}
          />
          <OptionCard
            option="custom"
            selected={draftOption === "custom"}
            saved={publishedOption === "custom"}
            label="Custom"
            description="Choose specific non-archived versions for the downloader. Great for multiple variants of the same version, like builds with different features or optional changes."
            detail={versionSummary(liveVersionLabels, "No custom versions are published.")}
            onSelect={onChooseOption}
          />
        </div>
        {draftOption === "custom" && selectionMode && (
          <div className="mt-4 rounded-md border border-[var(--border)]/70 bg-[var(--surface-1)]/70 px-3 py-2 text-xs text-foreground/65">
            <div className="font-medium text-foreground/80 mb-1">Custom draft</div>
            <div>
              {customSelectionCount > 0
                ? versionSummary(draftVersionLabels, "No versions selected.")
                : "No versions selected. Choose at least one version to publish Custom."}
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {selectionMode ? (
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={onClearSelections}
                className="inline-flex items-center justify-center h-10 sm:h-8 px-3 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors sm:w-auto"
              >
                Clear selections
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center h-10 sm:h-8 px-3 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50 sm:flex-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={publishDisabled}
                  className="inline-flex flex-1 items-center justify-center min-w-0 h-10 sm:h-8 px-3 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)] sm:flex-none sm:min-w-32"
                >
                  {saving ? "Publishing..." : "Publish Changes"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {draftOption === "custom" && !isSwitchingFromLatestToCustom && (
                  <button
                    type="button"
                    onClick={onEnterSelectionMode}
                    className="inline-flex items-center justify-center h-10 sm:h-8 px-3 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                  >
                    Edit patcher versions
                  </button>
                )}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="inline-flex items-center justify-center h-10 sm:h-8 px-3 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={publishDisabled}
                  className="inline-flex items-center justify-center min-w-32 h-10 sm:h-8 px-3 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
                >
                  {saving ? "Publishing..." : "Publish Changes"}
                </button>
              </div>
            </>
          )}
          {(showSaved || error) && (
            <div
              className="basis-full text-xs flex items-center min-w-0"
              aria-live="polite"
            >
              {showSaved ? (
              <span
                className={`text-emerald-600 dark:text-emerald-400 font-medium transition-opacity duration-[450ms] ease-out ${
                  savedFadeOut ? "opacity-0" : "opacity-100"
                }`}
              >
                Changes published.
              </span>
              ) : (
                <span className="text-red-400">{error}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}

function OptionCard({
  option,
  selected,
  saved,
  label,
  description,
  detail,
  onSelect,
}: {
  option: PatcherOption;
  selected: boolean;
  saved: boolean;
  label: string;
  description: string;
  detail: string;
  onSelect: (option: PatcherOption) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(option)}
      className={`w-full text-left rounded-md border-2 px-3 py-3 transition-colors flex gap-3 items-start touch-manipulation ${
        selected
          ? "border-[var(--accent)] bg-[var(--surface-2)]"
          : "border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)]"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
          selected ? "border-[var(--accent)]" : "border-[var(--border)]"
        }`}
        aria-hidden
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {saved && (
            <span className="inline-flex items-center rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide text-foreground/60 bg-foreground/5 ring-1 ring-[var(--border)]">
              Published
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs text-foreground/60">{description}</span>
        <span className="mt-2 block text-xs font-medium text-foreground/75">{detail}</span>
      </span>
    </button>
  );
}

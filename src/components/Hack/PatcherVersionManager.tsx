"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Primitives/Modal";
import { updatePatcherSelectablePatches } from "@/app/hack/[slug]/actions";
import PatcherVersionSettings from "@/components/Hack/PatcherVersionSettings";
import VersionList from "@/components/Hack/VersionList";
import { CUSTOM_VERSION_NAME_MAX_LENGTH, suggestCustomVersionName } from "@/utils/patches/hack-display-version";
import type { PatchesDownloadPermission } from "@/components/Hack/DownloadPermissionSettings";

type PatcherOption = "latest" | "custom";

interface Patch {
  id: number;
  version: string;
  created_at: string;
  updated_at: string | null;
  changelog: string | null;
  published: boolean;
  archived: boolean;
}

interface PatcherVersionManagerProps {
  hackSlug: string;
  currentPatchId: number | null;
  initialSavedPatchIds: number[];
  initialCustomVersionName: string | null;
  patches: Patch[];
  baseRom: string;
  patchesDownloadPermission: PatchesDownloadPermission;
  children?: React.ReactNode;
}

function sameOrderedIds(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

function optionFromSavedIds(savedPatchIds: number[]): PatcherOption {
  return savedPatchIds.length > 0 ? "custom" : "latest";
}

function initialCustomName(name: string | null, savedPatchIds: number[], patches: Patch[]) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName.slice(0, CUSTOM_VERSION_NAME_MAX_LENGTH);
  if (savedPatchIds.length === 0) return "";
  const firstSavedPatch = patches.find((patch) => patch.id === savedPatchIds[0]);
  return (firstSavedPatch?.version || "").slice(0, CUSTOM_VERSION_NAME_MAX_LENGTH);
}

export default function PatcherVersionManager({
  hackSlug,
  currentPatchId,
  initialSavedPatchIds,
  initialCustomVersionName,
  patches,
  baseRom,
  patchesDownloadPermission,
  children,
}: PatcherVersionManagerProps) {
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [publishedOption, setPublishedOption] = useState<PatcherOption>(() => optionFromSavedIds(initialSavedPatchIds));
  const [draftOption, setDraftOption] = useState<PatcherOption>(() => optionFromSavedIds(initialSavedPatchIds));
  const [savedPatchIds, setSavedPatchIds] = useState<number[]>(initialSavedPatchIds);
  const [draftPatchIds, setDraftPatchIds] = useState<number[]>(initialSavedPatchIds);
  const [savedCustomVersionName, setSavedCustomVersionName] = useState(() => initialCustomName(initialCustomVersionName, initialSavedPatchIds, patches));
  const [draftCustomVersionName, setDraftCustomVersionName] = useState(() => initialCustomName(initialCustomVersionName, initialSavedPatchIds, patches));
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedFadeOut, setSavedFadeOut] = useState(false);
  const savedTimersRef = useRef<{
    hold?: ReturnType<typeof setTimeout>;
    fade?: ReturnType<typeof setTimeout>;
  }>({});

  const initialSavedKey = initialSavedPatchIds.join(",");
  const initialCustomVersionNameKey = initialCustomVersionName ?? "";

  useEffect(() => {
    const nextOption = optionFromSavedIds(initialSavedPatchIds);
    const nextCustomVersionName = initialCustomName(initialCustomVersionName, initialSavedPatchIds, patches);
    setPublishedOption(nextOption);
    setDraftOption(nextOption);
    setSavedPatchIds(initialSavedPatchIds);
    setDraftPatchIds(initialSavedPatchIds);
    setSavedCustomVersionName(nextCustomVersionName);
    setDraftCustomVersionName(nextCustomVersionName);
    setSelectionMode(false);
  }, [initialSavedKey, initialSavedPatchIds, initialCustomVersionNameKey, initialCustomVersionName, patches]);

  function clearSavedFeedbackTimers() {
    const t = savedTimersRef.current;
    if (t.hold) clearTimeout(t.hold);
    if (t.fade) clearTimeout(t.fade);
    t.hold = undefined;
    t.fade = undefined;
  }

  useEffect(() => {
    return () => {
      clearSavedFeedbackTimers();
    };
  }, []);

  useEffect(() => {
    if (showPublishModal) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyPaddingRight = body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - html.clientWidth;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }

      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
      };
    }
  }, [showPublishModal]);

  const patchById = useMemo(() => new Map(patches.map((patch) => [patch.id, patch])), [patches]);
  const currentPatch = currentPatchId !== null ? patchById.get(currentPatchId) ?? null : null;
  const savedPatchIdSet = useMemo(() => new Set(savedPatchIds), [savedPatchIds]);

  const labelsForIds = (ids: number[]) => (
    ids.map((id) => patchById.get(id)?.version).filter((label): label is string => Boolean(label))
  );

  const liveVersionLabels = publishedOption === "custom"
    ? labelsForIds(savedPatchIds)
    : currentPatch
      ? [currentPatch.version]
      : [];
  const latestVersionLabels = currentPatch ? [currentPatch.version] : [];
  const draftVersionLabels = draftOption === "custom"
    ? labelsForIds(draftPatchIds)
    : currentPatch
      ? [currentPatch.version]
      : [];
  const selectedUnpublishedVersionLabels = draftOption === "custom"
    ? draftPatchIds
      .map((id) => patchById.get(id))
      .filter((patch): patch is Patch => Boolean(patch))
      .filter((patch) => !patch.published && !patch.archived)
      .map((patch) => patch.version)
    : [];
  const suggestedCustomVersionName = useMemo(
    () => suggestCustomVersionName(draftVersionLabels),
    [draftVersionLabels],
  );

  const hasUnsavedChanges = draftOption !== publishedOption
    || (draftOption === "custom" && !sameOrderedIds(draftPatchIds, savedPatchIds))
    || (draftOption === "custom" && draftCustomVersionName.trim() !== savedCustomVersionName);
  const publishDisabled = saving
    || !hasUnsavedChanges
    || (draftOption === "custom" && (draftPatchIds.length === 0 || !draftCustomVersionName.trim()));

  function enterCustomSelectionMode() {
    setDraftOption("custom");
    setSelectionMode(true);
    setError(null);
  }

  function chooseOption(option: PatcherOption) {
    setError(null);
    if (option === "latest") {
      setDraftOption("latest");
      setSelectionMode(false);
      return;
    }
    enterCustomSelectionMode();
  }

  function togglePatch(patchId: number) {
    const patch = patchById.get(patchId);
    if (!patch || patch.archived) return;

    setDraftOption("custom");
    setDraftPatchIds((current) => {
      if (current.includes(patchId)) {
        return current.filter((id) => id !== patchId);
      }
      return [...current, patchId];
    });
  }

  function clearSelections() {
    setDraftOption("custom");
    setDraftPatchIds([]);
    setSelectionMode(true);
    setError(null);
  }

  function cancelDraft() {
    setDraftOption(publishedOption);
    setDraftPatchIds(savedPatchIds);
    setDraftCustomVersionName(savedCustomVersionName);
    setSelectionMode(false);
    setError(null);
    setPublishError(null);
    setShowPublishModal(false);
    setShowSaved(false);
    setSavedFadeOut(false);
  }

  function openPublishModal() {
    if (publishDisabled) return;
    setError(null);
    setPublishError(null);
    setShowPublishModal(true);
  }

  function applySuggestedCustomVersionName() {
    if (!suggestedCustomVersionName) return;
    setDraftCustomVersionName(suggestedCustomVersionName);
  }

  async function confirmPublish() {
    const idsToSave = draftOption === "custom" ? draftPatchIds : [];
    const customNameToSave = draftOption === "custom" ? draftCustomVersionName.trim() : null;
    setSaving(true);
    setPublishError(null);
    try {
      const result = await updatePatcherSelectablePatches(hackSlug, idsToSave, customNameToSave);
      if (!result.ok) {
        setPublishError(result.error || "Failed to publish changes");
        return;
      }

      setSavedPatchIds(idsToSave);
      setDraftPatchIds(idsToSave);
      setSavedCustomVersionName(customNameToSave || "");
      setDraftCustomVersionName(customNameToSave || "");
      setPublishedOption(draftOption);
      setSelectionMode(false);
      setShowPublishModal(false);
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
      router.refresh();
    } catch {
      setPublishError("Failed to publish changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PatcherVersionSettings
        publishedOption={publishedOption}
        draftOption={draftOption}
        latestVersionLabels={latestVersionLabels}
        liveVersionLabels={liveVersionLabels}
        draftVersionLabels={draftVersionLabels}
        publishedCustomVersionName={savedCustomVersionName}
        customVersionName={draftCustomVersionName}
        suggestedCustomVersionName={suggestedCustomVersionName}
        customSelectionCount={draftPatchIds.length}
        selectionMode={selectionMode}
        hasUnsavedChanges={hasUnsavedChanges}
        publishDisabled={publishDisabled}
        saving={saving}
        error={error}
        showSaved={showSaved}
        savedFadeOut={savedFadeOut}
        onChooseOption={chooseOption}
        onEnterSelectionMode={enterCustomSelectionMode}
        onClearSelections={clearSelections}
        onCustomVersionNameChange={setDraftCustomVersionName}
        onApplySuggestedCustomVersionName={applySuggestedCustomVersionName}
        onCancel={cancelDraft}
        onPublish={openPublishModal}
      />
      {children}
      <VersionList
        patches={patches}
        currentPatchId={currentPatchId}
        canEdit
        hackSlug={hackSlug}
        baseRom={baseRom}
        patchesDownloadPermission={patchesDownloadPermission}
        patcherSelectionMode={selectionMode}
        draftPatchIds={draftPatchIds}
        savedPatchIds={savedPatchIds}
        isCustomPatcherActive={publishedOption === "custom"}
        onTogglePatcherPatch={togglePatch}
      />
      <Modal
        title="Publish Patcher Changes"
        visible={showPublishModal}
        onClose={() => !saving && setShowPublishModal(false)}
      >
        <p className="text-foreground/80 mb-3">
          These patches will be available to choose from in the downloader on your hack&apos;s homepage:
        </p>
        {draftVersionLabels.length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm text-foreground/75">
            {draftVersionLabels.map((label, index) => (
              <li key={label} className="flex items-center gap-2">
                <span aria-hidden>-</span>
                <span>{label}</span>
                {draftOption === "custom" && index === 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Default
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-foreground/60">No current patch is set.</p>
        )}
        {draftOption === "custom" && (
          <p className="mb-4 text-sm text-foreground/70">
            Public version name: <strong className="text-foreground">{draftCustomVersionName.trim()}</strong>
          </p>
        )}
        {selectedUnpublishedVersionLabels.length > 0 && (
          <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">
            Selected unpublished versions will be published when these changes are saved.
          </p>
        )}
        {publishError && (
          <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {publishError}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmPublish}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Publishing..." : "Publish Changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPublishModal(false);
              setPublishError(null);
            }}
            disabled={saving}
            className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}

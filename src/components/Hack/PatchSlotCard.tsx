"use client";

import React from "react";
import { baseRoms } from "@/data/baseRoms";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { platformAccept } from "@/utils/idb";
import { sha1Hex } from "@/utils/hash";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { patchFormatFromFilename } from "@/utils/patching";
import { encodeXdelta, trialDecodeXdelta, friendlyXdeltaError } from "@/utils/patching/xdelta";
import { FiAlertTriangle } from "react-icons/fi";
import Select from "@/components/Primitives/Select";
import { shortBaseRomName } from "@/utils/hacks/base-roms";
import { PATCH_INFO_MAX_LENGTH, PATCH_LABEL_MAX_LENGTH } from "@/utils/patches/patch-variant";

export type PatchSlotDraft = {
  id: string;
  label: string;
  info: string;
  baseRomId: string;
  patchMode: "bps" | "rom";
};

export type PatchSlotStatus = {
  file: File | null;
  genStatus: "idle" | "generating" | "ready" | "error";
  genError: string;
  checksumStatus: "idle" | "validating" | "valid" | "invalid" | "unknown";
  checksumError: string;
};

export function createPatchSlotDraft(partial?: Partial<PatchSlotDraft>): PatchSlotDraft {
  return {
    id: partial?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `slot-${Date.now()}-${Math.random()}`),
    label: partial?.label || "",
    info: partial?.info || "",
    baseRomId: partial?.baseRomId || "",
    patchMode: partial?.patchMode === "bps" ? "bps" : "rom",
  };
}

export function emptyPatchSlotStatus(): PatchSlotStatus {
  return { file: null, genStatus: "idle", genError: "", checksumStatus: "idle", checksumError: "" };
}

export function isPatchSlotReady(draft: PatchSlotDraft, status: PatchSlotStatus): boolean {
  return !!draft.label.trim()
    && !!draft.baseRomId
    && !!status.file
    && status.checksumStatus !== "invalid"
    && status.checksumStatus !== "validating"
    && (draft.patchMode === "bps" || status.genStatus === "ready" || status.checksumStatus === "valid" || status.checksumStatus === "unknown");
}

const INPUT = "h-10 w-full rounded-control bg-surface-2 px-3 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40";
const FILE_INPUT = "w-full min-w-0 cursor-pointer rounded-control bg-surface-2 px-3 py-2 text-sm italic text-text-3 ring-1 ring-inset ring-line file:bg-black/10 dark:file:bg-surface-2 file:text-text-2 file:text-sm file:font-medium file:not-italic file:rounded-control file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const LINK_BUTTON = "w-fit cursor-pointer text-xs text-text-3 underline underline-offset-2 transition-colors hover:text-text-2";

/** One patch of a multi-source upload: its name, player note, base ROM, and file (generated from a modified ROM, or uploaded). */
export default function PatchSlotCard({
  index,
  draft,
  status,
  allowedBaseRomIds,
  canRemove,
  fileNameHint,
  duplicateLabel = false,
  onDraftChange,
  onStatusChange,
  onRemove,
}: {
  index: number;
  draft: PatchSlotDraft;
  status: PatchSlotStatus;
  allowedBaseRomIds: string[];
  canRemove: boolean;
  fileNameHint: string;
  /** Another patch in this upload already uses this name. */
  duplicateLabel?: boolean;
  onDraftChange: (next: PatchSlotDraft) => void;
  onStatusChange: (next: PatchSlotStatus) => void;
  onRemove: () => void;
}) {
  const patchInputRef = React.useRef<HTMLInputElement | null>(null);
  const modifiedRomInputRef = React.useRef<HTMLInputElement | null>(null);
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();
  const idPrefix = React.useId();

  const baseRomEntry = React.useMemo(() => baseRoms.find((rom) => rom.id === draft.baseRomId) || null, [draft.baseRomId]);
  const baseRomPlatform = baseRomEntry?.platform;
  const baseRomName = baseRomEntry?.name || "";
  const baseRomReady = !!draft.baseRomId && (hasPermission(draft.baseRomId) || hasCached(draft.baseRomId));
  const baseRomNeedsPermission = !!draft.baseRomId && isLinked(draft.baseRomId) && !baseRomReady;
  const baseRomMissing = !!draft.baseRomId && !isLinked(draft.baseRomId) && !hasCached(draft.baseRomId);

  const allowedOptions = allowedBaseRomIds.map((id) => {
    const rom = baseRoms.find((item) => item.id === id);
    return { value: id, label: rom ? rom.name : id };
  });

  React.useEffect(() => {
    if (draft.baseRomId && !allowedBaseRomIds.includes(draft.baseRomId)) {
      onDraftChange({ ...draft, baseRomId: "" });
    }
    // Only re-check when the allowed set or selected ROM changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedBaseRomIds.join("|"), draft.baseRomId]);

  function resetFileState() {
    onStatusChange(emptyPatchSlotStatus());
    if (patchInputRef.current) patchInputRef.current.value = "";
    if (modifiedRomInputRef.current) modifiedRomInputRef.current.value = "";
  }

  async function onGrantPermission() {
    if (!draft.baseRomId) return;
    await ensurePermission(draft.baseRomId, true);
  }

  async function onUploadBaseRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      onStatusChange({ ...status, genError: "" });
      const file = e.target.files?.[0];
      if (!file) return;
      const matchedId = await importUploadedBlob(file);
      if (!matchedId) {
        onStatusChange({ ...status, genError: "That ROM doesn't match any supported base ROM." });
        return;
      }
      if (matchedId !== draft.baseRomId) {
        const matchedName = baseRoms.find((rom) => rom.id === matchedId)?.name;
        onStatusChange({ ...status, genError: `This ROM matches "${matchedName ?? matchedId}", but this patch requires "${baseRomName}".` });
      }
    } catch {
      onStatusChange({ ...status, genError: "Failed to import base ROM." });
    }
  }

  async function onUploadModifiedRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      onStatusChange({ ...status, genStatus: "generating", genError: "", file: null });
      const mod = e.target.files?.[0] || null;
      if (!mod || !draft.baseRomId) {
        onStatusChange({ ...status, genStatus: "idle" });
        return;
      }
      const baseFile = await getFileBlob(draft.baseRomId);
      if (!baseFile) {
        onStatusChange({ ...status, genStatus: "idle", genError: "Base ROM not available." });
        return;
      }
      if (baseRomEntry?.sha1) {
        const hash = await sha1Hex(baseFile);
        if (hash.toLowerCase() !== baseRomEntry.sha1.toLowerCase()) {
          onStatusChange({ ...status, genStatus: "error", genError: "Selected base ROM hash does not match the chosen base ROM." });
          return;
        }
      }
      const { result, patch } = await encodeXdelta({ sourceFile: baseFile, targetFile: mod });
      if (!result.ok || !patch) {
        onStatusChange({ ...status, genStatus: "error", genError: friendlyXdeltaError(result) });
        return;
      }
      const out = new File([patch], `${fileNameHint || "patch"}.xdelta`, { type: "application/octet-stream" });
      onStatusChange({ ...status, file: out, genStatus: "ready", genError: "", checksumStatus: "valid", checksumError: "" });
    } catch (err: any) {
      onStatusChange({ ...status, genStatus: "error", genError: err?.message || "Failed to generate patch." });
    }
  }

  async function onUploadPatch(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      onStatusChange({ ...status, checksumStatus: "validating", checksumError: "", file: null });
      const patch = e.target.files?.[0] || null;
      if (!patch) {
        onStatusChange({ ...status, checksumStatus: "idle", checksumError: "", file: null });
        return;
      }

      if (patchFormatFromFilename(patch.name) === "xdelta") {
        const baseFile = draft.baseRomId ? await getFileBlob(draft.baseRomId) : null;
        if (!baseFile) {
          onStatusChange({
            ...status,
            file: patch,
            checksumStatus: "unknown",
            checksumError: "Cannot validate without the base ROM on this device. Proceed at your own risk, or upload your modified ROM instead.",
          });
          return;
        }
        const result = await trialDecodeXdelta({ sourceFile: baseFile, patchBlob: patch });
        if (result.ok && result.hasChecksums === true) {
          onStatusChange({ ...status, file: patch, checksumStatus: "valid", checksumError: "" });
          return;
        }
        if (!result.ok) {
          const msg = (result.errorMessage ?? "").toLowerCase();
          onStatusChange({
            ...status,
            file: null,
            checksumStatus: "invalid",
            checksumError: msg.includes("checksum")
              ? "Checksum validation failed. The patch file is not compatible with the selected base ROM."
              : friendlyXdeltaError(result),
          });
          return;
        }
        onStatusChange({
          ...status,
          file: patch,
          checksumStatus: "unknown",
          checksumError: "This patch has no embedded checksums. Proceed at your own risk, or upload your modified ROM instead.",
        });
        return;
      }

      if (!baseRomEntry) {
        onStatusChange({
          ...status,
          file: patch,
          checksumStatus: "unknown",
          checksumError: "A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.",
        });
        return;
      }

      const bps = BPS.fromFile(new BinFile(await patch.arrayBuffer()));
      if (bps.sourceChecksum === 0 || bps.sourceChecksum === undefined) {
        onStatusChange({
          ...status,
          file: patch,
          checksumStatus: "unknown",
          checksumError: "A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.",
        });
        return;
      }

      if (bps.sourceChecksum !== parseInt(baseRomEntry.crc32, 16)) {
        onStatusChange({
          ...status,
          file: null,
          checksumStatus: "invalid",
          checksumError: "Checksum validation failed. The patch file is not compatible with the selected base ROM.",
        });
        return;
      }

      onStatusChange({ ...status, file: patch, checksumStatus: "valid", checksumError: "" });
    } catch (err: any) {
      onStatusChange({
        ...status,
        file: e.target.files?.[0] || null,
        checksumStatus: "unknown",
        checksumError: err?.message || "Failed to validate patch file.",
      });
    }
  }

  return (
    <fieldset className="grid min-w-0 gap-3 rounded-card border border-line bg-surface p-3.5">
      <legend className="sr-only">Patch {index + 1}</legend>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Patch {index + 1}</div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="inline-flex h-8 items-center rounded-control px-2 text-xs font-medium text-error transition-colors hover:bg-error-soft">
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-text-2">Applies to <span className="text-error">*</span></span>
          <Select
            value={draft.baseRomId}
            onChange={(value) => {
              // Name it after its ROM until the creator types a name of their own.
              const nextLabel = draft.label.trim() || shortBaseRomName(value);
              onDraftChange({ ...draft, baseRomId: value, label: nextLabel });
              resetFileState();
            }}
            disabled={allowedBaseRomIds.length === 0}
            placeholder={allowedBaseRomIds.length === 0 ? "Choose base ROMs first" : "Choose a base ROM"}
            options={allowedOptions}
          />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${idPrefix}-name`} className="text-xs font-medium text-text-2">Name <span className="text-error">*</span></label>
          <input
            id={`${idPrefix}-name`}
            value={draft.label}
            maxLength={PATCH_LABEL_MAX_LENGTH}
            onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
            placeholder="e.g. FireRed"
            aria-invalid={duplicateLabel || undefined}
            className={`${INPUT} ${duplicateLabel ? "ring-error/60" : ""}`}
          />
          {duplicateLabel && <span className="text-xs text-error">Another patch already uses this name.</span>}
        </div>
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${idPrefix}-info`} className="text-xs font-medium text-text-2">Note for players</label>
        <textarea
          id={`${idPrefix}-info`}
          rows={2}
          maxLength={PATCH_INFO_MAX_LENGTH}
          value={draft.info}
          onChange={(e) => onDraftChange({ ...draft, info: e.target.value })}
          placeholder="What's different about this patch, and who should pick it."
          className="rounded-control bg-surface-2 px-3 py-2 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <div className="text-[11px] text-text-3">{draft.info.length}/{PATCH_INFO_MAX_LENGTH}</div>
      </div>

      {draft.patchMode === "bps" ? (
        <div className="grid gap-2">
          <input ref={patchInputRef} onChange={onUploadPatch} type="file" accept=".bps,.xdelta" disabled={!draft.baseRomId} className={FILE_INPUT} />
          <p className="flex items-center gap-1.5 text-xs text-text-3">
            <FiAlertTriangle className="h-3 w-3 shrink-0 text-warn" />
            <span>Patch file upload is a fallback. Auto-generating from a modified ROM is recommended.</span>
          </p>
          {status.checksumStatus === "validating" && <div className="text-xs text-text-2">Validating checksum…</div>}
          {status.checksumStatus === "valid" && <div className="text-xs text-ready">Checksum valid.</div>}
          {status.checksumStatus === "invalid" && !!status.checksumError && <div className="text-xs text-error">{status.checksumError}</div>}
          {status.checksumStatus === "unknown" && !!status.checksumError && <div className="text-xs text-warn">{status.checksumError}</div>}
          <button
            type="button"
            onClick={() => {
              onDraftChange({ ...draft, patchMode: "rom" });
              resetFileState();
            }}
            className={LINK_BUTTON}
          >
            Generate from a modified ROM instead (Recommended)
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {draft.baseRomId && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-ready-soft text-ready ring-ready/40" : baseRomNeedsPermission ? "bg-warn-soft text-warn ring-warn/40" : "bg-error-soft text-error ring-error/40"}`}>
                {baseRomReady ? `${shortBaseRomName(draft.baseRomId)} ready` : baseRomNeedsPermission ? "Permission needed" : `${shortBaseRomName(draft.baseRomId)} ROM needed`}
              </span>
              {baseRomNeedsPermission && (
                <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-control border border-line bg-surface-2 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-60">
                  Grant permission
                </button>
              )}
              {baseRomMissing && (
                <label className="flex w-full min-w-0 flex-col items-start gap-1.5 text-xs text-text-2">
                  <span>Upload your clean {baseRomName} ROM</span>
                  <input type="file" onChange={onUploadBaseRom} className="w-full min-w-0 cursor-pointer rounded-control bg-surface-2 px-2 py-1 text-xs italic text-text-3 ring-1 ring-inset ring-line file:bg-black/10 dark:file:bg-surface-2 file:text-text-2 file:text-xs file:font-medium file:not-italic file:rounded-control file:border-0 file:px-2 file:py-1 file:mr-2 file:cursor-pointer" />
                </label>
              )}
            </div>
          )}
          {!!status.genError && status.genStatus !== "error" && <div className="text-xs text-error">{status.genError}</div>}
          <div className="grid gap-1.5">
            <label htmlFor={`${idPrefix}-mod`} className="text-xs font-medium text-text-2">Modified ROM <span className="text-text-3">(Recommended)</span></label>
            <input
              id={`${idPrefix}-mod`}
              ref={modifiedRomInputRef}
              type="file"
              accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
              disabled={!baseRomEntry || !baseRomReady || !baseRomPlatform}
              onChange={onUploadModifiedRom}
              className={FILE_INPUT}
            />
            <p className="text-xs text-text-3">{draft.baseRomId ? "We'll generate a .xdelta patch on-device. No ROMs are uploaded." : "Choose which base ROM this patch applies to first."}</p>
            {status.genStatus === "generating" && <div className="text-xs text-text-2">Generating patch…</div>}
            {status.genStatus === "ready" && status.file && <div className="text-xs text-ready">Patch ready: {status.file.name}</div>}
            {status.genStatus === "error" && !!status.genError && <div className="text-xs text-error">{status.genError}</div>}
          </div>
          <button
            type="button"
            onClick={() => {
              onDraftChange({ ...draft, patchMode: "bps" });
              resetFileState();
            }}
            className={LINK_BUTTON}
          >
            Already have a .bps or .xdelta file?
          </button>
        </div>
      )}
    </fieldset>
  );
}

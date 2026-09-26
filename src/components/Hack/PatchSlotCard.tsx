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

export function isPatchSlotReady(draft: PatchSlotDraft, status: PatchSlotStatus): boolean {
  return !!draft.label.trim()
    && !!draft.baseRomId
    && !!status.file
    && status.checksumStatus !== "invalid"
    && status.checksumStatus !== "validating"
    && (draft.patchMode === "bps" || status.genStatus === "ready" || status.checksumStatus === "valid" || status.checksumStatus === "unknown");
}

export default function PatchSlotCard({
  index,
  draft,
  status,
  allowedBaseRomIds,
  canRemove,
  fileNameHint,
  dummy = false,
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
  dummy?: boolean;
  onDraftChange: (next: PatchSlotDraft) => void;
  onStatusChange: (next: PatchSlotStatus) => void;
  onRemove: () => void;
}) {
  const patchInputRef = React.useRef<HTMLInputElement | null>(null);
  const modifiedRomInputRef = React.useRef<HTMLInputElement | null>(null);
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();

  const baseRomEntry = React.useMemo(() => baseRoms.find((rom) => rom.id === draft.baseRomId) || null, [draft.baseRomId]);
  const baseRomPlatform = baseRomEntry?.platform;
  const baseRomName = baseRomEntry?.name || "";
  const baseRomReady = !!draft.baseRomId && (hasPermission(draft.baseRomId) || hasCached(draft.baseRomId));
  const baseRomNeedsPermission = !!draft.baseRomId && isLinked(draft.baseRomId) && !baseRomReady;
  const baseRomMissing = !!draft.baseRomId && !isLinked(draft.baseRomId) && !hasCached(draft.baseRomId);

  const allowedOptions = allowedBaseRomIds.map((id) => {
    const rom = baseRoms.find((item) => item.id === id);
    return { value: id, label: rom ? `${rom.name} (${rom.platform})` : id };
  });

  React.useEffect(() => {
    if (draft.baseRomId && !allowedBaseRomIds.includes(draft.baseRomId)) {
      onDraftChange({ ...draft, baseRomId: "" });
    }
    // Only re-check when the allowed set or selected ROM changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedBaseRomIds.join("|"), draft.baseRomId]);

  function resetFileState() {
    onStatusChange({
      file: null,
      genStatus: "idle",
      genError: "",
      checksumStatus: "idle",
      checksumError: "",
    });
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
        onStatusChange({
          ...status,
          genError: `This ROM matches "${matchedName ?? matchedId}", but this patch requires "${baseRomName}".`,
        });
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
      const fileName = fileNameHint || draft.label || "patch";
      const { result, patch } = await encodeXdelta({ sourceFile: baseFile, targetFile: mod });
      if (!result.ok || !patch) {
        onStatusChange({ ...status, genStatus: "error", genError: friendlyXdeltaError(result) });
        return;
      }
      const out = new File([patch], `${fileName}.xdelta`, { type: "application/octet-stream" });
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

      const baseRomChecksum = parseInt(baseRomEntry.crc32, 16);
      if (bps.sourceChecksum !== baseRomChecksum) {
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
    <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Patch {index + 1}</div>
        {canRemove && !dummy && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-red-600 transition-colors hover:bg-black/5 dark:text-red-300 dark:hover:bg-white/10"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <label className="text-sm text-foreground/80">Name <span className="text-red-500">*</span></label>
          {dummy ? (
            <div className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">
              {draft.label || "e.g. FireRed"}
            </div>
          ) : (
            <input
              value={draft.label}
              maxLength={PATCH_LABEL_MAX_LENGTH}
              onChange={(e) => onDraftChange({ ...draft, label: e.target.value })}
              placeholder="e.g. FireRed"
              className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          )}
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-foreground/80">Applies to <span className="text-red-500">*</span></label>
          {dummy ? (
            <div className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">
              {baseRomName || "Select a base ROM"}
            </div>
          ) : (
            <Select
              value={draft.baseRomId}
              onChange={(value) => {
                const nextLabel = draft.label.trim() || shortBaseRomName(value);
                onDraftChange({ ...draft, baseRomId: value, label: nextLabel });
                resetFileState();
              }}
              disabled={allowedBaseRomIds.length === 0}
              placeholder={allowedBaseRomIds.length === 0 ? "Select base ROMs first" : "Select base ROM"}
              options={allowedOptions}
            />
          )}
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-foreground/80">Player information</label>
        {dummy ? (
          <div className="min-h-[4.5rem] rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] text-foreground/60 select-none">
            {draft.info || "Explain what this patch is for."}
          </div>
        ) : (
          <textarea
            rows={3}
            maxLength={PATCH_INFO_MAX_LENGTH}
            value={draft.info}
            onChange={(e) => onDraftChange({ ...draft, info: e.target.value })}
            placeholder="Explain what this patch is for, any differences from the others, and which players should pick it."
            className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        )}
        <div className="text-[11px] text-foreground/55">{draft.info.length}/{PATCH_INFO_MAX_LENGTH}</div>
      </div>

      {dummy ? (
        <div className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] select-none">
          Choose file
        </div>
      ) : draft.patchMode === "bps" ? (
        <div className="grid gap-2">
          <input
            ref={patchInputRef}
            onChange={onUploadPatch}
            type="file"
            accept=".bps,.xdelta"
            className="cursor-pointer rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer"
          />
          <p className="flex items-center gap-1.5 text-xs text-foreground/60">
            <FiAlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Patch file upload is a fallback. Auto-generating from a modified ROM is recommended.</span>
          </p>
          {status.checksumStatus === "validating" && <div className="text-xs text-foreground/70">Validating checksum…</div>}
          {status.checksumStatus === "valid" && <div className="text-xs text-emerald-400/90">Checksum valid.</div>}
          {status.checksumStatus === "invalid" && !!status.checksumError && <div className="text-xs text-red-400">{status.checksumError}</div>}
          {status.checksumStatus === "unknown" && !!status.checksumError && <div className="text-xs text-amber-400/90">{status.checksumError}</div>}
          <button
            type="button"
            onClick={() => {
              onDraftChange({ ...draft, patchMode: "rom" });
              resetFileState();
            }}
            className="w-fit cursor-pointer text-xs text-foreground/60 underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            Generate from a modified ROM instead (Recommended)
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--surface-2)]/50">
            <div className="text-xs text-foreground/75">Required base ROM</div>
            <div className="mt-1 text-sm font-medium">{baseRomEntry ? `${baseRomEntry.name} (${baseRomEntry.platform})` : "Select a base ROM for this patch"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90" : baseRomNeedsPermission ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90" : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"}`}>
                {baseRomReady ? "Ready" : baseRomNeedsPermission ? "Permission needed" : "Base ROM needed"}
              </span>
              {baseRomNeedsPermission && (
                <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed">Grant permission</button>
              )}
              {baseRomMissing && (
                <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                  <input type="file" onChange={onUploadBaseRom} className="cursor-pointer rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-xs file:font-medium file:not-italic file:rounded-md file:border-0 file:px-2 file:py-1 file:mr-2 file:cursor-pointer" />
                  <span>Upload base ROM</span>
                </label>
              )}
            </div>
            {!!status.genError && draft.patchMode === "rom" && status.genStatus !== "error" && <div className="mt-2 text-xs text-red-400">{status.genError}</div>}
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-foreground/80">Modified ROM <span className="text-foreground/60">(Recommended)</span></label>
            <input
              ref={modifiedRomInputRef}
              type="file"
              accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
              disabled={!baseRomEntry || !baseRomReady || !baseRomPlatform}
              onChange={onUploadModifiedRom}
              className="cursor-pointer rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-foreground/60">We&apos;ll generate a .xdelta patch on-device. No ROMs are uploaded.</p>
            {status.genStatus === "generating" && <div className="text-xs text-foreground/70">Generating patch…</div>}
            {status.genStatus === "ready" && status.file && <div className="text-xs text-emerald-400/90">Patch ready: {status.file.name}</div>}
            {status.genStatus === "error" && !!status.genError && <div className="text-xs text-red-400">{status.genError}</div>}
          </div>
          <button
            type="button"
            onClick={() => {
              onDraftChange({ ...draft, patchMode: "bps" });
              resetFileState();
            }}
            className="w-fit cursor-pointer text-xs text-foreground/60 underline underline-offset-2 transition-colors hover:text-foreground/80"
          >
            Already have a .bps or .xdelta file?
          </button>
        </div>
      )}
    </div>
  );
}

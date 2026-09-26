"use client";

import React from "react";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import { platformAccept } from "@/utils/idb";
import { sha1Hex } from "@/utils/hash";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { confirmAiDisclosure, presignNewPatchVersion, updateHack } from "@/app/hack/actions";
import AiLabel from "@/components/Hack/AiLabel";
import AiDisclosureModal from "@/components/Hack/AiDisclosureModal";
import type { AiDisclosure } from "@/utils/aiDisclosure";
import { confirmPatchUpload } from "@/app/submit/actions";
import { FaInfoCircle } from "react-icons/fa";
import { FiAlertTriangle, FiCheck } from "react-icons/fi";
import { patchFormatFromFilename } from "@/utils/patching";
import { encodeXdelta, trialDecodeXdelta, friendlyXdeltaError } from "@/utils/patching/xdelta";

export interface HackPatchFormProps {
  slug: string;
  baseRomId: string;
  existingVersions: string[];
  isCustomPatcherActive: boolean;
  customVersionName?: string | null;
  currentVersion?: string;
  /** The hack's AI label. New versions confirm or update it before upload; the first upload skips this (the draft checklist covers it). */
  ai: AiDisclosure | null;
}

export default function HackPatchForm(props: HackPatchFormProps) {
  const { slug, baseRomId, existingVersions, isCustomPatcherActive, currentVersion } = props;
  const [version, setVersion] = React.useState("");
  const [patchMode, setPatchMode] = React.useState<"bps" | "rom">("rom");
  const [patchFile, setPatchFile] = React.useState<File | null>(null);
  const [genStatus, setGenStatus] = React.useState<"idle" | "generating" | "ready" | "error">("idle");
  const [genError, setGenError] = React.useState<string>("");
  const [checksumStatus, setChecksumStatus] = React.useState<"idle" | "validating" | "valid" | "invalid" | "unknown">("idle");
  const [checksumError, setChecksumError] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [publishAutomatically, setPublishAutomatically] = React.useState(false);
  const [disclosure, setDisclosure] = React.useState(props.ai);
  // "confirmed" re-stamps the label once the upload lands; "updated" was already saved from the form.
  const [aiCheck, setAiCheck] = React.useState<"pending" | "confirmed" | "updated">("pending");
  const [aiFormOpen, setAiFormOpen] = React.useState(false);
  const needsAiCheck = existingVersions.length > 0;

  const versionInputRef = React.useRef<HTMLInputElement | null>(null);
  const patchInputRef = React.useRef<HTMLInputElement | null>(null);
  const modifiedRomInputRef = React.useRef<HTMLInputElement | null>(null);

  const baseRomEntry = React.useMemo(() => baseRoms.find(r => r.id === baseRomId) || null, [baseRomId]);
  const baseRomPlatform = baseRomEntry?.platform;
  const baseRomName = baseRomEntry?.name;

  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();
  const baseRomReady = !!baseRomId && (hasPermission(baseRomId) || hasCached(baseRomId));
  const baseRomNeedsPermission = !!baseRomId && isLinked(baseRomId) && !baseRomReady;
  const baseRomMissing = !!baseRomId && !isLinked(baseRomId) && !hasCached(baseRomId);

  const isVersionTaken = version.trim() && existingVersions.includes(version.trim());
  const canSubmit = React.useMemo(() => {
    return !!version.trim()
      && ((!!patchFile && patchMode === "bps") || (patchMode === "rom" && genStatus === "ready"))
      && !isVersionTaken
      && !submitting
      && checksumStatus !== "invalid"
      && checksumStatus !== "validating"
      && (!needsAiCheck || aiCheck !== "pending");
  }, [version, patchFile, patchMode, genStatus, isVersionTaken, submitting, checksumStatus, needsAiCheck, aiCheck]);

  React.useEffect(() => {
    versionInputRef.current?.focus();
  }, []);

  // Suggest next version based on currentVersion (supports: 1, 1.0, 1.0.0, v1, v1.0, v1.0.1)
  React.useEffect(() => {
    if (version.trim()) return;
    if (!currentVersion) return;
    const raw = String(currentVersion).trim();
    // Capture prefix (non-digit), numeric core, and any trailing suffix
    const m = raw.match(/^([^0-9]*\s*)([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?([\s\S]*)$/);
    if (!m) return;
    const preservedPrefix = m[1] || "";
    const major = parseInt(m[2] || "0", 10);
    const minor = parseInt(m[3] || "0", 10);
    const patch = parseInt(m[4] || "0", 10);
    const suffix = m[5] || "";
    const next = `${major}.${minor}.${patch + 1}${suffix}`;
    setVersion(preservedPrefix + next);
  }, [currentVersion]);

  React.useEffect(() => {
    setPatchFile(null);
    setGenStatus("idle");
    setGenError("");
    setChecksumStatus("idle");
    setChecksumError("");
    patchInputRef.current && (patchInputRef.current.value = "");
    modifiedRomInputRef.current && (modifiedRomInputRef.current.value = "");
  }, [patchMode]);

  async function onGrantPermission() {
    if (!baseRomId) return;
    await ensurePermission(baseRomId, true);
  }

  async function onUploadBaseRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenError("");
      const f = e.target.files?.[0];
      if (!f) return;
      const matched = await importUploadedBlob(f);
      if (!matched) {
        setGenError("That ROM doesn't match any supported base ROM.");
        return;
      }
      if (matched !== baseRomId) {
        setGenError(`This ROM matches "${matched}", but this hack requires "${baseRomName}".`);
        return;
      }
    } catch {
      setGenError("Failed to import base ROM.");
    }
  }

  async function onUploadModifiedRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenStatus("generating");
      setGenError("");
      const mod = e.target.files?.[0] || null;
      if (!mod || !baseRomId) {
        setGenStatus("idle");
        return;
      }
      let baseFile = await getFileBlob(baseRomId);
      if (!baseFile) {
        setGenStatus("idle");
        setGenError("Base ROM not available.");
        return;
      }
      if (baseRomEntry?.sha1) {
        const hash = await sha1Hex(baseFile);
        if (hash.toLowerCase() !== baseRomEntry.sha1.toLowerCase()) {
          setGenStatus("error");
          setGenError("Selected base ROM hash does not match the chosen base ROM.");
          return;
        }
      }
      const fname = `${slug}-${(version || "patch").replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
      const { result, patch } = await encodeXdelta({ sourceFile: baseFile, targetFile: mod });
      if (!result.ok || !patch) {
        setGenStatus("error");
        setGenError(friendlyXdeltaError(result));
        return;
      }
      const out = new File([patch], `${fname}.xdelta`, { type: 'application/octet-stream' });
      setPatchFile(out);
      setGenStatus("ready");
    } catch (err: any) {
      setGenStatus("error");
      setGenError(err?.message || "Failed to generate patch.");
    }
  }

  async function onUploadPatch(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setChecksumStatus("validating");
      setChecksumError("");

      const patch = e.target.files?.[0] || null;
      if (!patch) {
        setChecksumStatus("idle");
        setChecksumError("");
        setPatchFile(null);
        return;
      }

      if (patchFormatFromFilename(patch.name) === "xdelta") {
        const baseFile = baseRomId ? await getFileBlob(baseRomId) : null;
        if (!baseFile) {
          setChecksumStatus("unknown");
          setChecksumError("Cannot validate without the base ROM on this device. Proceed at your own risk, or upload your modified ROM instead.");
          setPatchFile(patch);
          return;
        }
        const result = await trialDecodeXdelta({ sourceFile: baseFile, patchBlob: patch });
        if (result.ok && result.hasChecksums === true) {
          setChecksumStatus("valid");
          setChecksumError("");
          setPatchFile(patch);
          return;
        }
        if (!result.ok) {
          const msg = (result.errorMessage ?? "").toLowerCase();
          setChecksumStatus("invalid");
          setChecksumError(
            msg.includes("checksum")
              ? "Checksum validation failed. The patch file is not compatible with the selected base ROM."
              : friendlyXdeltaError(result)
          );
          setPatchFile(null);
          return;
        }
        setChecksumStatus("unknown");
        setChecksumError("This patch has no embedded checksums. Proceed at your own risk, or upload your modified ROM instead.");
        setPatchFile(patch);
        return;
      }

      if (!baseRomEntry) {
        setChecksumStatus("unknown");
        setChecksumError("A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.");
        setPatchFile(patch);
        return;
      }

      const bps = BPS.fromFile(new BinFile(await patch.arrayBuffer()));
      if (bps.sourceChecksum === 0 || bps.sourceChecksum === undefined) {
        setChecksumStatus("unknown");
        setChecksumError("A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.");
        setPatchFile(patch);
        return;
      }

      const baseRomChecksum = parseInt(baseRomEntry.crc32, 16);
      if (bps.sourceChecksum !== baseRomChecksum) {
        setChecksumStatus("invalid");
        setChecksumError("Checksum validation failed. The patch file is not compatible with the selected base ROM.");
        setPatchFile(null);
        return;
      }

      setChecksumStatus("valid");
      setChecksumError("");
      setPatchFile(patch);
    } catch (err: any) {
      setChecksumStatus("unknown");
      setChecksumError(err?.message || "Failed to validate patch file.");
      setPatchFile(e.target.files?.[0] || null);
    }
  }

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const safeVersion = version.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
      const patchExt = patchFormatFromFilename(patchFile?.name) === "xdelta" ? "xdelta" : "bps";
      const objectKey = `${slug}-${safeVersion}.${patchExt}`;
      const presigned = await presignNewPatchVersion({ slug, version: version.trim(), objectKey });
      if (!presigned.ok) throw new Error(presigned.error || 'Failed to presign');
      await fetch(presigned.presignedUrl!, { method: 'PUT', body: patchFile!, headers: { 'Content-Type': 'application/octet-stream' } });
      const finalized = await confirmPatchUpload({ slug, objectKey: presigned.objectKey!, version: version.trim(), publishAutomatically });
      if (!finalized.ok) throw new Error(finalized.error || 'Failed to finalize');
      if (aiCheck === "confirmed") await confirmAiDisclosure(slug);
      window.location.href = finalized.redirectTo!;
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5">
      {currentVersion !== undefined && (
        <div className="flex items-center rounded-control border border-line/70 bg-surface-2/20 px-3 py-2">
          <div className="min-w-[24px]">
            <FaInfoCircle size={12} className="mr-1 text-text-2" />
          </div>
          <div className="flex flex-col">
            <p data-has-custom-patcher={isCustomPatcherActive} className="text-xs text-text-3 data-[has-custom-patcher=true]:text-text data-[has-custom-patcher=true]:text-sm">
              {isCustomPatcherActive ? 'Public version name:' : 'Current version:'} <span className="text-text font-bold">{currentVersion || 'Not set'}</span>
            </p>
            {isCustomPatcherActive && (
              <p className="text-xs text-text-3 mt-1">
                <span className="font-bold">Custom</span> selected for the <span className="font-bold">Patcher Version Settings</span>.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <label className="text-sm text-text-2">New Version <span className="text-error">*</span></label>
        <input
          ref={versionInputRef}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v1.2.0"
          className={`h-11 rounded-control bg-surface-2 px-3 text-sm ring-1 ring-inset ${isVersionTaken ? 'ring-error/40 bg-error-soft dark:ring-error/40 dark:bg-error-soft' : 'ring-line'} focus:outline-none focus:ring-2 focus:ring-accent/40`}
        />
        <div className="text-xs text-text-3">
          {isVersionTaken ? 'Already used by this hack.' : 'Use semantic versions like v1.2.0.'}
        </div>
        {existingVersions.length > 0 && (
          <div className="text-[11px] text-text-3">Existing versions: {existingVersions.join(', ')}</div>
        )}
      </div>

      <div className="grid gap-3">
        <label className="text-sm text-text-2">Provide patch <span className="text-error">*</span></label>
        <div className="flex flex-col gap-3">
          {patchMode === "bps" && (
            <div className="grid gap-2">
              <input
                ref={patchInputRef}
                onChange={onUploadPatch}
                type="file"
                accept=".bps,.xdelta"
                className="cursor-pointer rounded-control bg-surface-2 px-3 py-2 text-sm italic text-text-3 ring-1 ring-inset ring-line file:bg-black/10 dark:file:bg-surface-2 file:text-text-2 file:text-sm file:font-medium file:not-italic file:rounded-control file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer"
              />
              <p className="flex items-center gap-1.5 text-xs text-text-3">
                <FiAlertTriangle className="h-3 w-3 shrink-0 text-warn" />
                <span>Patch file upload is a fallback. Hackdex cannot always guarantee that an uploaded patch is compatible with the chosen base ROM. Auto-generating from a modified ROM is recommended.</span>
              </p>
              {checksumStatus === "validating" && <div className="text-xs text-text-2">Validating checksum…</div>}
              {checksumStatus === "valid" && <div className="text-xs text-ready">Checksum valid.</div>}
              {checksumStatus === "invalid" && !!checksumError && <div className="text-xs text-error">{checksumError}</div>}
              {checksumStatus === "unknown" && !!checksumError && <div className="text-xs text-warn">{checksumError}</div>}
              <button
                type="button"
                onClick={() => setPatchMode("rom")}
                className="w-fit cursor-pointer text-xs text-text-3 underline underline-offset-2 transition-colors hover:text-text-2"
              >
                Generate from a modified ROM instead (Recommended)
              </button>
            </div>
          )}

          {patchMode === "rom" && (
            <div className="grid gap-3">
              <div className="rounded-control border border-line p-3 bg-surface-2/50">
                <div className="text-xs text-text-2">Required base ROM</div>
                <div className="mt-1 text-sm font-medium">{baseRomEntry ? `${baseRomEntry.name} (${baseRomEntry.platform})` : "Select base ROM in main Edit page"}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-ready-soft text-white ring-ready/40 dark:bg-ready-soft dark:text-ready dark:ring-ready/40" : baseRomNeedsPermission ? "bg-warn-soft text-white ring-warn/40 dark:bg-warn-soft dark:text-warn dark:ring-warn/40" : "bg-error-soft text-white ring-error/40 dark:bg-error-soft dark:text-error dark:ring-error/40"}`}>
                    {baseRomReady ? "Ready" : baseRomNeedsPermission ? "Permission needed" : "Base ROM needed"}
                  </span>
                  {baseRomNeedsPermission && (
                    <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-control border border-line bg-surface-2 px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed">Grant permission</button>
                  )}
                  {baseRomMissing && (
                    <label className="inline-flex items-center gap-2 text-xs text-text-2">
                      <input type="file" onChange={onUploadBaseRom} className="cursor-pointer rounded-control bg-surface-2 px-2 py-1 text-xs italic text-text-3 ring-1 ring-inset ring-line file:bg-black/10 dark:file:bg-surface-2 file:text-text-2 file:text-xs file:font-medium file:not-italic file:rounded-control file:border-0 file:px-2 file:py-1 file:mr-2 file:cursor-pointer" />
                      <span>Upload base ROM</span>
                    </label>
                  )}
                </div>
                {!!genError && <div className="mt-2 text-xs text-error">{genError}</div>}
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-text-2">Modified ROM <span className="text-text-3">(Recommended)</span></label>
                <input
                  ref={modifiedRomInputRef}
                  type="file"
                  accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
                  disabled={!baseRomEntry || !baseRomReady || !baseRomPlatform}
                  onChange={onUploadModifiedRom}
                  className="cursor-pointer rounded-control bg-surface-2 px-3 py-2 text-sm italic text-text-3 ring-1 ring-inset ring-line file:bg-black/10 dark:file:bg-surface-2 file:text-text-2 file:text-sm file:font-medium file:not-italic file:rounded-control file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-text-3">We'll generate a .xdelta patch on-device. No ROMs are uploaded.</p>
                {genStatus === "generating" && <div className="text-xs text-text-2">Generating patch…</div>}
                {genStatus === "ready" && patchFile && <div className="text-xs text-ready">Patch ready: {patchFile.name}</div>}
                {genStatus === "error" && !!genError && <div className="text-xs text-error">{genError}</div>}
              </div>
              <button
                type="button"
                onClick={() => setPatchMode("bps")}
                className="w-fit cursor-pointer text-xs text-text-3 underline underline-offset-2 transition-colors hover:text-text-2"
              >
                Already have a .bps or .xdelta file?
              </button>
            </div>
          )}
        </div>
      </div>

      {needsAiCheck && (
        <div className="grid gap-2.5 border-t border-line pt-4">
          <div>
            <div className="text-sm font-medium text-text">Is the AI label still accurate?</div>
            <p className="mt-0.5 text-xs text-text-3">Count anything AI-generated you added since the last version.</p>
          </div>
          {disclosure ? (
            <AiLabel disclosure={disclosure} />
          ) : (
            <p className="rounded-card border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-text-3">This hack has no AI label yet. Every hack needs one, even with no AI use.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {disclosure && aiCheck !== "updated" && (
              <button
                type="button"
                aria-pressed={aiCheck === "confirmed"}
                onClick={() => setAiCheck(aiCheck === "confirmed" ? "pending" : "confirmed")}
                className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 text-sm font-medium transition-colors hover:border-text-3 aria-pressed:border-ready aria-pressed:bg-ready-soft aria-pressed:text-ready"
              >
                {aiCheck === "confirmed" && <FiCheck className="h-4 w-4" />} Still accurate
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiFormOpen(true)}
              className="inline-flex h-9 items-center rounded-control border border-line-strong bg-surface px-3 text-sm font-medium transition-colors hover:border-text-3"
            >
              {disclosure ? "Update" : "Add AI label"}
            </button>
            {aiCheck === "updated" && (
              <span className="inline-flex items-center gap-1 text-xs text-ready">
                <FiCheck className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
          <AiDisclosureModal
            visible={aiFormOpen}
            initial={disclosure}
            onClose={() => setAiFormOpen(false)}
            onSave={async (levels, note) => {
              const res = await updateHack({ slug, ai: { levels, note } });
              if (!res.ok) {
                setError(res.error);
                return false;
              }
              setDisclosure({ levels, note, disclosedAt: new Date().toISOString() });
              setAiCheck("updated");
              return true;
            }}
          />
        </div>
      )}

      {!!error && <div className="text-sm text-error">{error}</div>}

      <div className="flex items-start gap-3 border-t border-line pt-4 mt-2">
        <label className="flex items-start gap-2 cursor-pointer has-disabled:cursor-not-allowed">
          <input
            type="checkbox"
            disabled={isCustomPatcherActive || submitting}
            checked={!isCustomPatcherActive && publishAutomatically}
            onChange={(e) => {
              if (isCustomPatcherActive) return;
              setPublishAutomatically(e.target.checked);
            }}
            className="mt-0.5 rounded border-line text-ready focus:ring-ready/40"
          />
          <div className="text-sm">
            <div className="font-medium text-text">Publish Automatically</div>
            {isCustomPatcherActive ? (
              <div className="italic text-text-3 mt-0.5">
                <p>Because you have "Custom" selected for the Patcher Version Settings, this version <span className="font-bold">cannot</span> be published automatically.</p>
                <p className="mt-1">To make this patch available for download, you will need to manually select it after pressing the <span className="font-bold">"Edit patcher versions"</span> button.</p>
              </div>
            ): (
              <div className="text-text-3 mt-0.5">
                If checked, this version will be published and set as the current patch immediately after upload.
              </div>
            )}
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-control bg-accent-deep px-5 text-white transition-colors hover:enabled:bg-accent-hover disabled:opacity-60 h-11 min-w-[7.5rem] text-sm font-semibold disabled:cursor-not-allowed"
        >
          <span>{submitting ? 'Uploading…' : 'Upload version'}</span>
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { createClient } from "@/utils/supabase/client";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import { platformAccept } from "@/utils/idb";
import { sha1Hex } from "@/utils/hash";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { presignNewPatchVersion } from "@/app/hack/actions";
import { confirmPatchUpload } from "@/app/submit/actions";
import { FaInfoCircle } from "react-icons/fa";

export interface HackPatchFormProps {
  slug: string;
  baseRomId: string;
  existingVersions: string[];
  currentVersion?: string;
}

export default function HackPatchForm(props: HackPatchFormProps) {
  const { slug, baseRomId, existingVersions, currentVersion } = props;
  const [version, setVersion] = React.useState("");
  const [patchMode, setPatchMode] = React.useState<"bps" | "rom">("bps");
  const [patchFile, setPatchFile] = React.useState<File | null>(null);
  const [genStatus, setGenStatus] = React.useState<"idle" | "generating" | "ready" | "error">("idle");
  const [genError, setGenError] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const versionInputRef = React.useRef<HTMLInputElement | null>(null);
  const patchInputRef = React.useRef<HTMLInputElement | null>(null);
  const modifiedRomInputRef = React.useRef<HTMLInputElement | null>(null);

  const supabase = createClient();
  const baseRomEntry = React.useMemo(() => baseRoms.find(r => r.id === baseRomId) || null, [baseRomId]);
  const baseRomPlatform = baseRomEntry?.platform;
  const baseRomName = baseRomEntry?.name;

  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();
  const baseRomReady = !!baseRomName && (hasPermission(baseRomName) || hasCached(baseRomName));
  const baseRomNeedsPermission = !!baseRomName && isLinked(baseRomName) && !baseRomReady;
  const baseRomMissing = !!baseRomName && !isLinked(baseRomName) && !hasCached(baseRomName);

  const isVersionTaken = version.trim() && existingVersions.includes(version.trim());
  const canSubmit = React.useMemo(() => {
    return !!version.trim() && ((!!patchFile && patchMode === "bps") || (patchMode === "rom" && genStatus === "ready")) && !isVersionTaken && !submitting;
  }, [version, patchFile, patchMode, genStatus, isVersionTaken, submitting]);

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
    patchInputRef.current && (patchInputRef.current.value = "");
    modifiedRomInputRef.current && (modifiedRomInputRef.current.value = "");
  }, [patchMode]);

  async function onGrantPermission() {
    if (!baseRomName) return;
    await ensurePermission(baseRomName, true);
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
      if (matched !== baseRomName) {
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
      if (!mod || !baseRomName) {
        setGenStatus("idle");
        return;
      }
      let baseFile = await getFileBlob(baseRomName);
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
      const [origBuf, modBuf] = await Promise.all([baseFile.arrayBuffer(), mod.arrayBuffer()]);
      const origBin = new BinFile(origBuf);
      const modBin = new BinFile(modBuf);
      const deltaMode = origBin.fileSize <= 4194304;
      const patch = BPS.buildFromRoms(origBin, modBin, deltaMode);
      const fname = `${slug}-${(version || "patch").replace(/[^a-zA-Z0-9._-]+/g, "-")}`;
      const patchBin = patch.export(fname);
      const out = new File([patchBin._u8array], `${fname}.bps`, { type: 'application/octet-stream' });
      setPatchFile(out);
      setGenStatus("ready");
    } catch (err: any) {
      setGenStatus("error");
      setGenError(err?.message || "Failed to generate patch.");
    }
  }

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const presigned = await presignNewPatchVersion({ slug, version: version.trim() });
      if (!presigned.ok) throw new Error(presigned.error || 'Failed to presign');
      await fetch(presigned.presignedUrl!, { method: 'PUT', body: patchFile!, headers: { 'Content-Type': 'application/octet-stream' } });
      const finalized = await confirmPatchUpload({ slug, objectKey: presigned.objectKey!, version: version.trim() });
      if (!finalized.ok) throw new Error(finalized.error || 'Failed to finalize');
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
        <div className="flex items-center rounded-md border border-[var(--border)]/70 bg-[var(--surface-2)]/20 px-3 py-2">
          <FaInfoCircle size={12} className="mr-1 text-foreground/80" />
          <p className="text-xs text-foreground/60">Current version: <span className="text-foreground/90 font-medium">{currentVersion || 'Not set'}</span></p>
        </div>
      )}
      <div className="grid gap-2">
        <label className="text-sm text-foreground/80">New Version <span className="text-red-500">*</span></label>
        <input
          ref={versionInputRef}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. v1.2.0"
          className={`h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ${isVersionTaken ? 'ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20' : 'ring-[var(--border)]'} focus:outline-none focus:ring-2 focus:ring-[var(--ring)]`}
        />
        <div className="text-xs text-foreground/60">
          {isVersionTaken ? 'Already used by this hack.' : 'Use semantic versions like v1.2.0.'}
        </div>
        {existingVersions.length > 0 && (
          <div className="text-[11px] text-foreground/60">Existing versions: {existingVersions.join(', ')}</div>
        )}
      </div>

      <div className="grid gap-3">
        <label className="text-sm text-foreground/80">Provide patch <span className="text-red-500">*</span></label>
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center">
            <button
              type="button"
              onClick={() => setPatchMode("bps")}
              className={`rounded-md rounded-r-none px-3 py-1.5 text-xs border-l-1 border-y-1 ${patchMode === "bps" ? "bg-[var(--surface-2)] border-[var(--border)]" : "text-foreground/70 border-[var(--border)]"}`}
            >
              Upload .bps
            </button>
            <button
              type="button"
              onClick={() => setPatchMode("rom")}
              className={`rounded-md rounded-l-none px-3 py-1.5 text-xs border-1 ${patchMode === "rom" ? "bg-[var(--surface-2)] border-[var(--border)]" : "text-foreground/70 border-[var(--border)]"}`}
            >
              Upload modified ROM (auto-generate .bps)
            </button>
          </div>

          {patchMode === "bps" && (
            <div className="grid gap-2">
              <input
                ref={patchInputRef}
                onChange={(e) => setPatchFile(e.target.files?.[0] || null)}
                type="file"
                accept=".bps"
                className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer"
              />
              <p className="text-xs text-foreground/60">Upload a BPS patch file.</p>
            </div>
          )}

          {patchMode === "rom" && (
            <div className="grid gap-3">
              <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--surface-2)]/50">
                <div className="text-xs text-foreground/75">Required base ROM</div>
                <div className="mt-1 text-sm font-medium">{baseRomEntry ? `${baseRomEntry.name} (${baseRomEntry.platform})` : "Select base ROM in main Edit page"}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90" : baseRomNeedsPermission ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90" : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"}`}>
                    {baseRomReady ? "Ready" : baseRomNeedsPermission ? "Permission needed" : "Base ROM needed"}
                  </span>
                  {baseRomNeedsPermission && (
                    <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed">Grant permission</button>
                  )}
                  {baseRomMissing && (
                    <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                      <input type="file" onChange={onUploadBaseRom} className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--border)]" />
                      <span>Upload base ROM</span>
                    </label>
                  )}
                </div>
                {!!genError && <div className="mt-2 text-xs text-red-400">{genError}</div>}
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Modified ROM</label>
                <input
                  ref={modifiedRomInputRef}
                  type="file"
                  accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
                  disabled={!baseRomEntry || !baseRomReady || !baseRomPlatform}
                  onChange={onUploadModifiedRom}
                  className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-foreground/60">We'll generate a .bps patch on-device. No ROMs are uploaded.</p>
                {genStatus === "generating" && <div className="text-xs text-foreground/70">Generating patch…</div>}
                {genStatus === "ready" && patchFile && <div className="text-xs text-emerald-400/90">Patch ready: {patchFile.name}</div>}
                {genStatus === "error" && !!genError && <div className="text-xs text-red-400">{genError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {!!error && <div className="text-sm text-red-400">{error}</div>}

      <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4 mt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
        >
          <span>{submitting ? 'Uploading…' : 'Upload version'}</span>
        </button>
      </div>
    </div>
  );
}



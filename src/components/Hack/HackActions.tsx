"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";

interface HackActionsProps {
  title: string;
  version: string;
  author: string;
  baseRomId: string;
  platform?: "GBA" | "GBC" | "GB" | "NDS";
  patchUrl: string;
}

const HackActions: React.FC<HackActionsProps> = ({
  title,
  version,
  author,
  baseRomId,
  platform,
  patchUrl,
}) => {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, linkRom, getFileBlob, supported } = useBaseRoms();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done" | "downloading">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [patchBlob, setPatchBlob] = React.useState<Blob | null>(null);
  const baseRomName = React.useMemo(() => baseRoms.find(r => r.id === baseRomId)?.name || null, [baseRomId]);

  React.useEffect(() => {
    if ((isLinked(baseRomId) && hasPermission(baseRomId)) || hasCached(baseRomId)) {
      if (status !== "downloading" && status !== "patching" && status !== "done") {
        setStatus("ready");
      }
    }
  }, [baseRomId, isLinked, hasPermission, hasCached, status]);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    if (error) {
      timeoutId = setTimeout(() => {
        setError(null);
      }, 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [error]);

  // Pre-download patch on mount (or when patchUrl changes) and cache as Blob
  React.useEffect(() => {
    let aborted = false;
    async function prefetchPatch() {
      try {
        setPatchBlob(null);
        if (!patchUrl) return;
        // indicate downloading while we fetch the patch blob
        setStatus((prev) => (prev === "patching" || prev === "done" ? prev : "downloading"));
        const res = await fetch(patchUrl);
        if (!res.ok) throw new Error("Failed to fetch patch");
        const blob = await res.blob();
        if (aborted) return;
        setPatchBlob(blob);
        // restore status after download: ready if base rom uploaded/linked, else idle
        setStatus((prev) => {
          if (prev === "patching" || prev === "done") return prev;
          const romReady = !!file || (isLinked(baseRomId) && (hasPermission(baseRomId) || hasCached(baseRomId)));
          return romReady ? "ready" : "idle";
        });
      } catch {
        if (!aborted) {
          setPatchBlob(null);
          // on error, fall back to current readiness state
          setStatus((prev) => {
            if (prev === "patching" || prev === "done") return prev;
            const romReady = !!file || (isLinked(baseRomId) && (hasPermission(baseRomId) || hasCached(baseRomId)));
            return romReady ? "ready" : "idle";
          });
        }
      }
    }
    prefetchPatch();
    return () => {
      aborted = true;
    };
  }, [patchUrl]);

  async function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const id = await importUploadedBlob(f);
      if (!id) {
        setError("That ROM doesn't match any supported base ROM.");
        setStatus("idle");
        e.target.value = "";
        return;
      }
      if (id !== baseRomId) {
        setError(`This ROM matches "${id}", but this hack requires "${baseRomName}".`);
        setStatus("idle");
        e.target.value = "";
        return;
      }
      setStatus("ready");
    }
  }

  async function onPatch() {
    try {
      setError(null);
      let baseFile = file;
      if (!baseFile) {
        if (!isLinked(baseRomId) && !hasCached(baseRomId)) return;
        if (!hasCached(baseRomId)) {
          const perm = await ensurePermission(baseRomId, true);
          if (perm !== "granted") return;
        }
        const linkedFile = await getFileBlob(baseRomId);
        if (!linkedFile) return;
        baseFile = linkedFile;
      }

      if (!patchUrl) return;

      setStatus("patching");

      // Read inputs
      const [romBuf, patchBuf] = await Promise.all([
        baseFile.arrayBuffer(),
        (async () => {
          let blob = patchBlob;
          if (!blob) {
            const resp = await fetch(patchUrl);
            if (!resp.ok) throw new Error("Failed to fetch patch");
            blob = await resp.blob();
            setPatchBlob(blob);
          }
          return await blob.arrayBuffer();
        })(),
      ]);

      // Build BinFiles
      const romBin = new BinFile(romBuf);
      romBin.fileName = baseFile.name + (platform ? `.${platform.toLowerCase()}` : "");
      const patchBin = new BinFile(patchBuf);

      // Parse and apply BPS
      const patch = BPS.fromFile(patchBin);
      const patchedRom = patch.apply(romBin);

      // Name output and download
      const outExt = platform ? platform.toLowerCase() : 'bin';
      const outputName = `${title} (${version}).${outExt}`;
      patchedRom.fileName = outputName;
      patchedRom.save();

      setStatus("done");
    } catch (e: any) {
      setError(e?.message || "Failed to patch ROM");
      setStatus("idle");
      console.error(e);
    }
  }

  return (
    <StickyActionBar
      title={title}
      version={version}
      author={author}
      baseRomName={baseRomName}
      baseRomPlatform={platform}
      onPatch={onPatch}
      status={status}
      error={error}
      isLinked={isLinked(baseRomId)}
      romReady={hasPermission(baseRomId) || hasCached(baseRomId)}
      onClickLink={() => (isLinked(baseRomId) ? ensurePermission(baseRomId, true) : linkRom(baseRomId))}
      supported={supported}
      onUploadChange={onSelectFile}
    />
  );
};

export default HackActions;



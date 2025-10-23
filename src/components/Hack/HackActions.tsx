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
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done">("idle");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isLinked(baseRomId) && (hasPermission(baseRomId) || hasCached(baseRomId))) {
      setStatus("ready");
    }
  }, [baseRomId, isLinked, hasPermission, hasCached]);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus(f ? "ready" : "idle");
    if (f) importUploadedBlob(f);
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
        fetch(patchUrl).then((r) => {
          if (!r.ok) throw new Error("Failed to fetch patch");
          return r.arrayBuffer();
        }),
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
      onPatch={onPatch}
      status={status}
      isLinked={isLinked(baseRomId)}
      ready={hasPermission(baseRomId) || hasCached(baseRomId)}
      onClickLink={() => (isLinked(baseRomId) ? ensurePermission(baseRomId, true) : linkRom(baseRomId))}
      supported={supported}
      onUploadChange={onSelectFile}
    />
  );
};

export default HackActions;



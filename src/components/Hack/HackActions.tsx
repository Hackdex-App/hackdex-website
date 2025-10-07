"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import { useBaseRoms } from "@/contexts/BaseRomContext";

export default function HackActions({ title, version, author, baseRom }: { title: string; version?: string; author: string; baseRom: string }) {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, linkRom, getFileBlob, supported } = useBaseRoms();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done">("idle");

  React.useEffect(() => {
    if (isLinked(baseRom) && (hasPermission(baseRom) || hasCached(baseRom))) {
      setStatus("ready");
    }
  }, [baseRom, isLinked, hasPermission, hasCached]);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus(f ? "ready" : "idle");
    if (f) importUploadedBlob(f);
  }

  async function onPatch() {
    if (!file) {
      if (!isLinked(baseRom) && !hasCached(baseRom)) return;
      if (!hasCached(baseRom)) {
        const perm = await ensurePermission(baseRom, true);
        if (perm !== "granted") return;
      }
      const linkedFile = await getFileBlob(baseRom);
      if (!linkedFile) return;
    }
    setStatus("patching");
    setTimeout(() => setStatus("done"), 1200);
  }

  return (
    <StickyActionBar
      title={title}
      version={version}
      author={author}
      onPatch={onPatch}
      status={status}
      isLinked={isLinked(baseRom)}
      ready={hasPermission(baseRom) || hasCached(baseRom)}
      onClickLink={() => (isLinked(baseRom) ? ensurePermission(baseRom, true) : linkRom(baseRom))}
      supported={supported}
      onUploadChange={onSelectFile}
    />
  );
}



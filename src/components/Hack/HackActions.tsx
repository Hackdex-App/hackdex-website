"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import type { DownloadEventDetail } from "@/types/util";
import { getSignedPatchUrl } from "@/app/hack/[slug]/actions";

interface HackActionsProps {
  title: string;
  version: string;
  author: string;
  baseRomId: string;
  platform?: "GBA" | "GBC" | "GB" | "NDS";
  patchFilename: string | null;
  patchId?: number;
  hackSlug: string;
}

const HackActions: React.FC<HackActionsProps> = ({
  title,
  version,
  author,
  baseRomId,
  platform,
  patchFilename,
  patchId,
  hackSlug,
}) => {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, linkRom, getFileBlob, supported } = useBaseRoms();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done" | "downloading">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [patchBlob, setPatchBlob] = React.useState<Blob | null>(null);
  const [patchUrl, setPatchUrl] = React.useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const baseRomName = React.useMemo(() => baseRoms.find(r => r.id === baseRomId)?.name || null, [baseRomId]);

  // Basic client-side bot detection
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof localStorage === 'undefined') {
      setError("Browser features not available");
      return;
    }
    // Check for basic browser features
    if (!window.navigator || !window.navigator.userAgent) {
      setError("Invalid browser environment");
      return;
    }
  }, []);

  React.useEffect(() => {
    if ((isLinked(baseRomId) && hasPermission(baseRomId)) || hasCached(baseRomId)) {
      if (status !== "downloading" && status !== "patching" && status !== "done") {
        if (termsAgreed && patchUrl) {
          setStatus("ready");
        } else {
          setStatus("idle");
        }
      }
    }
  }, [baseRomId, isLinked, hasPermission, hasCached, status, termsAgreed, patchUrl]);

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

  // When patch URL is fetched and terms are agreed, automatically proceed with patching if ROM is ready
  React.useEffect(() => {
    if (termsAgreed && patchUrl && patchBlob && status === "idle") {
      const romReady = !!file || (isLinked(baseRomId) && (hasPermission(baseRomId) || hasCached(baseRomId)));
      if (romReady) {
        // Automatically start patching
        setStatus("ready");
        // Use setTimeout to avoid calling onPatch during render
        const timeoutId = setTimeout(() => {
          onPatch();
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [termsAgreed, patchUrl, patchBlob, file, baseRomId, isLinked, hasPermission, hasCached, status]);

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

  async function onAgreeToTerms() {
    try {
      setError(null);
      setStatus("downloading");

      // Fetch signed URL from server
      const result = await getSignedPatchUrl(hackSlug);
      if (!result.ok) {
        setError(result.error);
        setStatus("idle");
        return;
      }

      setPatchUrl(result.url);
      setTermsAgreed(true);

      // Download patch blob
      const res = await fetch(result.url);
      if (!res.ok) throw new Error("Failed to fetch patch");
      const blob = await res.blob();
      setPatchBlob(blob);

      // Update status based on ROM readiness
      const romReady = !!file || (isLinked(baseRomId) && (hasPermission(baseRomId) || hasCached(baseRomId)));
      if (romReady) {
        setStatus("ready");
      } else {
        setStatus("idle");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch patch URL");
      setStatus("idle");
    }
  }

  async function onPatch() {
    try {
      setError(null);

      // If terms not agreed yet, trigger agreement flow
      if (!termsAgreed || !patchUrl || !patchBlob) {
        await onAgreeToTerms();
        return;
      }

      // Prevent multiple patching attempts
      if (status === "patching" || status === "done") {
        return;
      }

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

      // Best-effort log applied event for counting and animate badge
      try {
        if (patchId != null) {
          const key = "deviceId";
          let deviceId = localStorage.getItem(key);
          if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem(key, deviceId);
          }
          await fetch(`/api/patches/${patchId}/applied`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId }),
          })
            .then((res) => {
              if (res.status === 201) {
                window.dispatchEvent(new CustomEvent<DownloadEventDetail>("hack:patch-applied", { detail: { slug: hackSlug } }));
              }
            })
            .catch(() => {});
        }
      } catch {}
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
      filename={patchFilename}
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
      termsAgreed={termsAgreed}
    />
  );
};

export default HackActions;



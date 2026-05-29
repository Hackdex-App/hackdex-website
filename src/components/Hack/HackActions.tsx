"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import BaseRomErrorModal, { type BaseRomErrorModalState } from "@/components/Hack/BaseRomErrorModal";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import type { DownloadEventDetail } from "@/types/util";
import { getSignedPatchUrl, updatePatchDownloadCount } from "@/app/hack/[slug]/actions";
import { sha1Hex } from "@/utils/hash";
import {
  formatRequiredRomExtension,
  isArchiveFile,
  isAnyRomExtension,
} from "@/utils/romFile";

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
  const [romErrorModal, setRomErrorModal] = React.useState<BaseRomErrorModalState | null>(null);
  const [isVerifyingRom, setIsVerifyingRom] = React.useState(false);
  const baseRomName = React.useMemo(() => baseRoms.find(r => r.id === baseRomId)?.name || null, [baseRomId]);
  const effectivePlatform = React.useMemo(
    () => platform ?? baseRoms.find(r => r.id === baseRomId)?.platform,
    [platform, baseRomId],
  );

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
    setFile(null);
    if (!f) return;

    const requiredRomName = baseRomName ?? "this hack's base ROM";
    const requiredExtensionPhrase = effectivePlatform
      ? formatRequiredRomExtension(effectivePlatform)
      : "a ROM file";

    const resetInput = () => {
      e.target.value = "";
      setStatus("idle");
    };

    if (isArchiveFile(f.name)) {
      setRomErrorModal({
        kind: "archive",
        fileName: f.name,
        requiredExtensionPhrase,
        requiredRomName,
      });
      resetInput();
      return;
    }

    if (!isAnyRomExtension(f.name)) {
      setRomErrorModal({
        kind: "unrecognized",
        fileName: f.name,
        requiredExtensionPhrase,
        requiredRomName,
      });
      resetInput();
      return;
    }

    setIsVerifyingRom(true);
    try {
      const selectedHash = await sha1Hex(f);
      const match = baseRoms.find((r) => r.sha1.toLowerCase() === selectedHash.toLowerCase());
      const requiredHash = baseRoms.find((r) => r.id === baseRomId)?.sha1.toLowerCase() ?? "";

      if (!match) {
        setRomErrorModal({
          kind: "hash_mismatch",
          fileName: f.name,
          selectedHash,
          requiredHash,
          requiredRomName,
        });
        resetInput();
        return;
      }

      if (match.id !== baseRomId) {
        await importUploadedBlob(f);
        setRomErrorModal({
          kind: "hash_mismatch",
          fileName: f.name,
          selectedHash,
          requiredHash,
          requiredRomName,
          matchedRomName: match.name,
        });
        resetInput();
        return;
      }

      await importUploadedBlob(f);
      setFile(f);
      setStatus("ready");
    } finally {
      setIsVerifyingRom(false);
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
      setTermsAgreed(false);
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
          // Defer count update to avoid Safari cancelling the request
          setTimeout(async () => {
            const deviceIdObscured = deviceId.split("-");
            const result = await updatePatchDownloadCount(patchId, deviceIdObscured);
            if (!result.ok) {
              console.error(result.error);
            } else if (result.didIncrease) {
              window.dispatchEvent(new CustomEvent<DownloadEventDetail>("hack:patch-applied", { detail: { slug: hackSlug } }));
            }
          }, 50);
        }
      } catch (e: any) {
        console.error(e);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to patch ROM");
      setStatus("idle");
      console.error(e);
    }
  }

  return (
    <>
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
        isVerifyingRom={isVerifyingRom}
      />
      {romErrorModal && (
        <BaseRomErrorModal
          state={romErrorModal}
          onClose={() => setRomErrorModal(null)}
        />
      )}
    </>
  );
};

export default HackActions;



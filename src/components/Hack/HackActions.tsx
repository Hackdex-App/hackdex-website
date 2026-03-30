"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import PatchProgressBar from "@/components/Hack/PatchProgressBar";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import type { DownloadEventDetail } from "@/types/util";
import { getSignedPatchUrl, updatePatchDownloadCount } from "@/app/hack/[slug]/actions";

const PROGRESS_MESSAGES = {
  PREPARING_DOWNLOAD: "Preparing download...",
  DOWNLOADING_PATCH: "Downloading patch file...",
  DOWNLOAD_COMPLETE: "Download complete!",
  PREPARING_PATCH: "Preparing to patch...",
  LOADING_BASE_ROM: "Loading base ROM...",
  READING_ROM_FILES: "Reading ROM files...",
  BUILDING_PATCH_FILES: "Building patch files...",
  APPLYING_PATCH: "Applying patch...",
  PREPARING_FINAL_DOWNLOAD: "Preparing download...",
  COMPLETE: "Complete!",
} as const;

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

export default function HackActions({
  title,
  version,
  author,
  baseRomId,
  platform,
  patchFilename,
  patchId,
  hackSlug,
}: HackActionsProps) {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, linkRom, getFileBlob, supported } = useBaseRoms();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done" | "downloading">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [patchBlob, setPatchBlob] = React.useState<Blob | null>(null);
  const [patchUrl, setPatchUrl] = React.useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressLabel, setProgressLabel] = React.useState("");
  const baseRomName = React.useMemo(() => baseRoms.find(r => r.id === baseRomId)?.name || null, [baseRomId]);

  const progressBarHeight = React.useMemo(() => {
    const isVisible = status === "downloading" || status === "patching" || progress > 0;
    if (!isVisible) return 0;
    return progressLabel ? 64 : 44;
  }, [status, progress, progressLabel]);

  // Basic client-side bot detection
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof localStorage === "undefined") {
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
    };
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
      setProgress(10);
      setProgressLabel(PROGRESS_MESSAGES.PREPARING_DOWNLOAD);

      // Fetch signed URL from server
      const result = await getSignedPatchUrl(hackSlug);
      if (!result.ok) {
        setError(result.error);
        setStatus("idle");
        setProgress(0);
        setProgressLabel("");
        return;
      }

      setPatchUrl(result.url);
      setTermsAgreed(true);
      setProgress(30);
      setProgressLabel(PROGRESS_MESSAGES.DOWNLOADING_PATCH);

      // Download patch blob
      const res = await fetch(result.url);
      if (!res.ok) throw new Error("Failed to fetch patch");

      const contentLength = res.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (total > 0 && res.body) {
        const reader = res.body.getReader();
        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          const downloadProgress = 30 + (receivedLength / total) * 60;
          setProgress(downloadProgress);
        }

        setProgress(90);
        const blob = new Blob(chunks);
        setPatchBlob(blob);
      } else {
        const blob = await res.blob();
        setPatchBlob(blob);
        setProgress(90);
      }

      setProgress(100);
      setProgressLabel(PROGRESS_MESSAGES.DOWNLOAD_COMPLETE);

      setTimeout(() => {
        setProgress(0);
        setProgressLabel("");
      }, 500);

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
      setProgress(0);
      setProgressLabel("");
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

      setProgress(5);
      setProgressLabel(PROGRESS_MESSAGES.PREPARING_PATCH);
      setStatus("patching");

      // this is to make sure it slides down properly
      await new Promise(resolve => {
        let count = 0;
        const waitFrames = () => {
          if (++count < 18) {
            requestAnimationFrame(waitFrames);
          } else {
            resolve(undefined);
          }
        };
        requestAnimationFrame(waitFrames);
      });

      let baseFile = file;
      if (!baseFile) {
        if (!isLinked(baseRomId) && !hasCached(baseRomId)) return;
        if (!hasCached(baseRomId)) {
          const perm = await ensurePermission(baseRomId, true);
          if (perm !== "granted") {
            setProgress(0);
            setProgressLabel("");
            setStatus("idle");
            return;
          }
        }
        setProgress(15);
        setProgressLabel(PROGRESS_MESSAGES.LOADING_BASE_ROM);
        await new Promise(resolve => requestAnimationFrame(resolve));

        const linkedFile = await getFileBlob(baseRomId);
        if (!linkedFile) {
          setProgress(0);
          setProgressLabel("");
          setStatus("idle");
          return;
        }
        baseFile = linkedFile;
      }

      if (!patchUrl) return;

      setProgress(30);
      setProgressLabel(PROGRESS_MESSAGES.READING_ROM_FILES);
      await new Promise(resolve => requestAnimationFrame(resolve));

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

      setProgress(50);
      setProgressLabel(PROGRESS_MESSAGES.BUILDING_PATCH_FILES);
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Build BinFiles
      const romBin = new BinFile(romBuf);
      romBin.fileName = baseFile.name + (platform ? `.${platform.toLowerCase()}` : "");
      const patchBin = new BinFile(patchBuf);

      setProgress(65);
      setProgressLabel(PROGRESS_MESSAGES.APPLYING_PATCH);
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Parse and apply BPS
      const patch = BPS.fromFile(patchBin);
      const patchedRom = patch.apply(romBin);

      setProgress(85);
      setProgressLabel(PROGRESS_MESSAGES.PREPARING_FINAL_DOWNLOAD);
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Name output and download
      const outExt = platform ? platform.toLowerCase() : "bin";
      const outputName = `${title} (${version}).${outExt}`;
      patchedRom.fileName = outputName;
      patchedRom.save();

      setProgress(100);
      setProgressLabel(PROGRESS_MESSAGES.COMPLETE);

      setTimeout(() => {
        setProgress(0);
        setProgressLabel("");
      }, 1000);

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
          const finalDeviceId = deviceId;
          // Defer count update to avoid Safari cancelling the request
          setTimeout(async () => {
            const deviceIdObscured = finalDeviceId.split("-");
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
      setProgress(0);
      setProgressLabel("");
      console.error(e);
    }
  }

  return (
    <>
      <PatchProgressBar
        progress={progress}
        visible={status === "downloading" || status === "patching" || progress > 0}
        label={progressLabel}
      />
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
        progressBarHeight={progressBarHeight}
      />
    </>
  );
}


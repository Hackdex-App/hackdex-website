"use client";

import React from "react";
import StickyActionBar from "@/components/Hack/StickyActionBar";
import BaseRomErrorModal, { type BaseRomErrorModalState } from "@/components/Hack/BaseRomErrorModal";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { baseRoms } from "@/data/baseRoms";
import type { DownloadEventDetail } from "@/types/util";
import { getSignedPatchUrl, updatePatchDownloadCount, reportPatchDownloadEvent } from "@/app/hack/[slug]/actions";
import { sha1Hex } from "@/utils/hash";
import {
  formatRequiredRomExtension,
  isArchiveFile,
  isAnyRomExtension,
} from "@/utils/romFile";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import {
  collectFetchDiagnostics,
  runConnectivityProbes,
  type FetchFailurePhase,
  type ResponseMetadata,
} from "@/utils/patches/download-telemetry";
import { downloadPatch, DownloadPatchError } from "@/utils/patches/download-patch";
import type { SelectablePatch } from "@/types/patcher";
import { applyPatch, patchFormatFromFilename, type PatchFormat } from "@/utils/patching";
import { createOutputSink, SaveCancelledError, type OutputSink } from "@/utils/patching/save";

function deferReport(payload: Parameters<typeof reportPatchDownloadEvent>[0]) {
  setTimeout(async () => {
    try {
      await reportPatchDownloadEvent(payload);
    } catch {}
  }, 50);
}

function getPageOrigin(): string | null {
  return typeof window !== "undefined" ? window.location.origin : null;
}

function createFetchSessionId(): string | null {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (process.env.NODE_ENV === "development") {
    return `dev-${Date.now()}`;
  }
  return null;
}

interface HackActionsProps {
  title: string;
  version: string;
  author: string;
  baseRomId: string;
  platform?: "GBA" | "GBC" | "GB" | "NDS";
  patchFilename: string | null;
  patchId?: number;
  hackSlug: string;
  patcherSelector: {
    selectablePatches: SelectablePatch[];
    defaultPatchId: number | null;
  };
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
  patcherSelector,
}) => {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, linkRom, getFileBlob, supported } = useBaseRoms();
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<"idle" | "ready" | "patching" | "done" | "downloading">("idle");
  const [patchProgress, setPatchProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [patchBlob, setPatchBlob] = React.useState<Blob | null>(null);
  const [patchUrl, setPatchUrl] = React.useState<string | null>(null);
  const [patchFormat, setPatchFormat] = React.useState<PatchFormat | null>(null);
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [romErrorModal, setRomErrorModal] = React.useState<BaseRomErrorModalState | null>(null);
  const [isVerifyingRom, setIsVerifyingRom] = React.useState(false);
  const [selectedPatchId, setSelectedPatchId] = React.useState<number | null>(patcherSelector.defaultPatchId);
  const selectedPatchIdRef = React.useRef(selectedPatchId);
  const fetchSessionIdRef = React.useRef<string | null | undefined>(undefined);
  selectedPatchIdRef.current = selectedPatchId;

  function getFetchSessionId(): string | null {
    if (fetchSessionIdRef.current !== undefined) {
      return fetchSessionIdRef.current;
    }
    const id = createFetchSessionId();
    fetchSessionIdRef.current = id;
    return id;
  }
  const baseRomName = React.useMemo(() => baseRoms.find(r => r.id === baseRomId)?.name || null, [baseRomId]);
  const effectivePlatform = React.useMemo(
    () => platform ?? baseRoms.find(r => r.id === baseRomId)?.platform,
    [platform, baseRomId],
  );
  const selectedPatch = React.useMemo(
    () => patcherSelector.selectablePatches.find((patch) => patch.id === selectedPatchId)
      ?? patcherSelector.selectablePatches[0]
      ?? null,
    [patcherSelector.selectablePatches, selectedPatchId],
  );
  const selectedVersion = selectedPatch?.version ?? version;
  const selectedFilename = selectedPatch?.filename ?? patchFilename;

  function isRomReadyForPatch() {
    return !!file || hasCached(baseRomId) || (isLinked(baseRomId) && hasPermission(baseRomId));
  }

  React.useEffect(() => {
    setSelectedPatchId(patcherSelector.defaultPatchId);
  }, [patcherSelector.defaultPatchId]);

  function resetPatchSession() {
    setTermsAgreed(false);
    setPatchUrl(null);
    setPatchBlob(null);
    setPatchFormat(null);
    setStatus("idle");
  }

  function onVersionChange(nextPatchId: number) {
    if (nextPatchId === selectedPatchId) return;
    selectedPatchIdRef.current = nextPatchId;
    setSelectedPatchId(nextPatchId);
    resetPatchSession();
  }

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

  async function onAgreeToTerms(): Promise<{ url: string; blob: Blob; format: PatchFormat } | null> {
    const selectedPatchIdAtStart = selectedPatchId;
    const eventPatchId = selectedPatch?.id ?? patchId ?? null;
    const online = typeof navigator !== "undefined" ? navigator.onLine : null;
    const correlationId = getFetchSessionId();

    let signedUrl: string;
    let signedFormat: PatchFormat;
    try {
      setError(null);
      setStatus("downloading");

      const result = await getSignedPatchUrl(
        hackSlug,
        selectedPatch ? { patchId: selectedPatch.id } : undefined,
      );
      if (!result.ok) {
        setError(result.error);
        setStatus("idle");
        deferReport({
          patchId: eventPatchId,
          hackSlug,
          stage: "signed_url",
          outcome: "failure",
          errorName: "ServerError",
          errorMessage: result.error,
          online,
          pageOrigin: getPageOrigin(),
          correlationId,
          probeSameOrigin: "skipped",
          probePatchHost: "skipped",
        });
        return null;
      }
      if (selectedPatchIdRef.current !== selectedPatchIdAtStart) {
        return null;
      }
      signedUrl = result.url;
      signedFormat = result.format;
    } catch (e: any) {
      setError(e?.message || "Failed to fetch patch URL");
      setStatus("idle");
      deferReport({
        patchId: eventPatchId,
        hackSlug,
        stage: "signed_url",
        outcome: "failure",
        errorName: e?.name ?? null,
        errorMessage: e?.message ?? null,
        online,
        pageOrigin: getPageOrigin(),
        correlationId,
        probeSameOrigin: "skipped",
        probePatchHost: "skipped",
      });
      return null;
    }

    if (selectedPatchIdRef.current !== selectedPatchIdAtStart) {
      return null;
    }

    setPatchUrl(signedUrl);
    setPatchFormat(signedFormat);
    setTermsAgreed(true);

    const fetchStartedAt = performance.now();
    let failurePhase: FetchFailurePhase = "request";
    let responseMeta: ResponseMetadata = {
      responseStatus: null,
      contentLength: null,
      contentEncoding: null,
      contentType: null,
    };
    const sessionFields = {
      pageOrigin: getPageOrigin(),
      correlationId,
    };

    try {
      const download = await downloadPatch({
        url: signedUrl,
        getNewSignedUrl: async () => {
          const result = await getSignedPatchUrl(
            hackSlug,
            eventPatchId == null ? undefined : { patchId: eventPatchId },
          );
          if (!result.ok) throw new Error(result.error);
          return result.url;
        },
      });
      signedUrl = download.url;
      failurePhase = download.failurePhase;
      responseMeta = download.responseMetadata;

      const selectionIsCurrent = selectedPatchIdRef.current === selectedPatchIdAtStart;
      if (selectionIsCurrent) {
        setPatchUrl(download.url);
        setPatchBlob(download.blob);
      }

      const romReady = isRomReadyForPatch();
      if (selectionIsCurrent && !romReady) {
        setStatus("idle");
      }

      const shouldReportSuccess = download.resumeCount > 0 || Math.random() < 0.1;
      if (shouldReportSuccess) {
        const elapsed = performance.now() - fetchStartedAt;
        const diagnostics = collectFetchDiagnostics(download.url, elapsed);
        deferReport({
          patchId: eventPatchId,
          hackSlug,
          stage: "fetch",
          outcome: "success",
          online,
          sampleRate: download.resumeCount > 0 ? 1 : 0.1,
          resumeCount: download.resumeCount,
          receivedBytes: download.receivedBytes,
          ...sessionFields,
          ...responseMeta,
          ...diagnostics,
        });
      }

      if (!selectionIsCurrent) return null;
      return { url: download.url, blob: download.blob, format: signedFormat };
    } catch (e: any) {
      const downloadError = e instanceof DownloadPatchError ? e : null;
      const failureUrl = downloadError?.url ?? signedUrl;
      const resumeCount = downloadError?.resumeCount ?? 0;
      const receivedBytes = downloadError?.receivedBytes ?? 0;
      failurePhase = downloadError?.failurePhase ?? failurePhase;
      responseMeta = downloadError?.responseMetadata ?? responseMeta;

      if (selectedPatchIdRef.current === selectedPatchIdAtStart) {
        setError(e?.name === "HTTPError" ? "Failed to fetch patch" : (e?.message || "Failed to fetch patch URL"));
        setStatus("idle");
        setTermsAgreed(false);
      }

      const elapsed = performance.now() - fetchStartedAt;
      setTimeout(async () => {
        try {
          const probes = await runConnectivityProbes(failureUrl);
          const diagnostics = collectFetchDiagnostics(failureUrl, elapsed);
          await reportPatchDownloadEvent({
            patchId: eventPatchId,
            hackSlug,
            stage: "fetch",
            outcome: "failure",
            failurePhase,
            errorName: e?.name ?? null,
            errorMessage: e?.message ?? null,
            online,
            resumeCount,
            receivedBytes,
            ...sessionFields,
            ...responseMeta,
            ...diagnostics,
            probeSameOrigin: probes.probeSameOrigin,
            probePatchHost: probes.probePatchHost,
          });
        } catch {}
      }, 50);

      return null;
    }
  }

  async function onPatch() {
    let outputSink: OutputSink | null = null;
    const discardSink = async () => {
      if (!outputSink) return;
      const sink = outputSink;
      outputSink = null;
      try {
        await sink.abort();
      } catch {
        // ignore abort failures when discarding an unused sink
      }
    };

    try {
      setError(null);

      // Create xdelta sink during the click gesture, before any other awaits that
      // would drop transient user activation (terms download, ROM permission, etc.).
      const outExt = platform ? platform.toLowerCase() : "bin";
      const outputName = `${title} (${selectedVersion}).${outExt}`;
      const earlyFormat = patchFormat ?? patchFormatFromFilename(selectedFilename);
      if (earlyFormat === "xdelta" && status !== "patching") {
        try {
          outputSink = await createOutputSink(outputName);
        } catch (e: unknown) {
          if (e instanceof SaveCancelledError) {
            setStatus("idle");
            setPatchProgress(null);
            return;
          }
          throw e;
        }
      }

      let url = patchUrl;
      let blob = patchBlob;
      let format = patchFormat;

      if (!termsAgreed || !url || !blob || !format) {
        const downloaded = await onAgreeToTerms();
        if (!downloaded) {
          await discardSink();
          return;
        }
        url = downloaded.url;
        blob = downloaded.blob;
        format = downloaded.format;

        const romReady = isRomReadyForPatch();
        if (!romReady) {
          await discardSink();
          return;
        }
      }

      // BPS uses rom-patcher save; drop any unused early sink.
      if (format !== "xdelta") {
        await discardSink();
      }

      if (status === "patching") {
        return;
      }

      let baseFile = file;
      if (!baseFile) {
        if (!isLinked(baseRomId) && !hasCached(baseRomId)) {
          await discardSink();
          return;
        }
        if (!hasCached(baseRomId)) {
          const perm = await ensurePermission(baseRomId, true);
          if (perm !== "granted") {
            await discardSink();
            return;
          }
        }
        const linkedFile = await getFileBlob(baseRomId);
        if (!linkedFile) {
          await discardSink();
          return;
        }
        baseFile = linkedFile;
      }

      setStatus("patching");
      setPatchProgress(null);

      try {
        await Promise.all([
          new Promise((r) => setTimeout(r, 1000)),
          (async () => {
            // BPS ignores outputSink; xdelta uses the gesture-created sink.
            const sink = outputSink;
            outputSink = null;
            await applyPatch({
              format,
              baseFile,
              patchBlob: blob,
              outputName,
              sourceName: baseFile.name + (platform ? `.${platform.toLowerCase()}` : ""),
              outputSink: sink ?? undefined,
              onProgress: ({ bytesOut }) => setPatchProgress(bytesOut),
            });
          })(),
        ]);
      } catch (e: unknown) {
        if (e instanceof SaveCancelledError) {
          setStatus("idle");
          setPatchProgress(null);
          return;
        }
        throw e;
      } finally {
        setPatchProgress(null);
      }

      setStatus("done");

      // Best-effort log applied event for counting and animate badge
      try {
        const countPatchId = selectedPatch?.id ?? patchId;
        if (countPatchId != null) {
          const deviceId = getOrCreateDeviceId();
          if (!deviceId) return;
          // Defer count update to avoid Safari cancelling the request
          setTimeout(async () => {
            const deviceIdObscured = deviceId.split("-");
            const result = await updatePatchDownloadCount(countPatchId, deviceIdObscured);
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
      await discardSink();
      setError(e?.message || "Failed to patch ROM");
      setStatus("idle");
      setPatchProgress(null);
      console.error(e);
      deferReport({
        patchId: selectedPatch?.id ?? patchId ?? null,
        hackSlug,
        stage: "patch",
        outcome: "failure",
        errorName: e?.name ?? null,
        errorMessage: e?.message ?? null,
        online: typeof navigator !== "undefined" ? navigator.onLine : null,
        pageOrigin: getPageOrigin(),
        correlationId: getFetchSessionId(),
        probeSameOrigin: "skipped",
        probePatchHost: "skipped",
      });
    }
  }

  return (
    <>
      <StickyActionBar
        title={title}
        version={selectedVersion}
        selectablePatches={patcherSelector.selectablePatches}
        selectedPatchId={selectedPatch?.id ?? selectedPatchId}
        onVersionChange={onVersionChange}
        author={author}
        filename={selectedFilename}
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
        patchProgress={patchProgress}
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



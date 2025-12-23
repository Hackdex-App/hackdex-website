"use client";

import React, { useState, useEffect, useRef } from "react";
import { FiX, FiMoreVertical } from "react-icons/fi";
import {
  FaDownload,
  FaTrash,
  FaRotateLeft,
  FaUpload,
  FaCheck,
} from "react-icons/fa6";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import {
  archivePatchVersion,
  restorePatchVersion,
  rollbackToVersion,
  publishPatchVersion,
  getPatchDownloadUrl,
  reuploadPatchVersion,
  confirmReuploadPatchVersion,
} from "@/app/hack/[slug]/actions";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { sha1Hex } from "@/utils/hash";
import { baseRoms, type BaseRom } from "@/data/baseRoms";
import { platformAccept } from "@/utils/idb";
import { useBaseRoms } from "@/contexts/BaseRomContext";

interface Patch {
  id: number;
  version: string;
  created_at: string;
  changelog: string | null;
  published: boolean;
  archived: boolean;
}

interface VersionActionsProps {
  patch: Patch;
  isCurrent: boolean;
  hackSlug: string;
  baseRom: string;
  currentPatchCreatedAt: string | null;
  onActionComplete: () => void;
}

export default function VersionActions({
  patch,
  isCurrent,
  hackSlug,
  baseRom,
  currentPatchCreatedAt,
  onActionComplete,
}: VersionActionsProps) {
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showReuploadModal, setShowReuploadModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [patchMode, setPatchMode] = useState<"bps" | "rom">("bps");
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [checksumStatus, setChecksumStatus] = useState<"idle" | "validating" | "valid" | "invalid" | "unknown">("idle");
  const [checksumError, setChecksumError] = useState<string>("");
  const [genStatus, setGenStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [genError, setGenError] = useState<string>("");
  const [baseRomFile, setBaseRomFile] = useState<File | null>(null);
  const patchInputRef = useRef<HTMLInputElement>(null);
  const modifiedRomInputRef = useRef<HTMLInputElement>(null);
  const baseRomInputRef = useRef<HTMLInputElement>(null);

  const baseRomEntry = baseRoms.find((r) => r.id === baseRom);
  const baseRomPlatform = baseRomEntry?.platform;
  const baseRomReady = baseRom && (hasPermission(baseRom) || hasCached(baseRom));
  const baseRomNeedsPermission = baseRom && isLinked(baseRom) && !baseRomReady;
  const baseRomMissing = baseRom && !isLinked(baseRom) && !hasCached(baseRom);

  // Determine if this patch is newer than the current patch
  const isNewerThanCurrent = currentPatchCreatedAt
    ? new Date(patch.created_at).getTime() > new Date(currentPatchCreatedAt).getTime()
    : false;

  // Don't show Rollback if the patch is unpublished and newer than the current version
  const shouldShowRollback = !isCurrent && !(!patch.published && isNewerThanCurrent);

  useEffect(() => {
    if (showDeleteModal || showRestoreModal || showRollbackModal || showPublishModal || showReuploadModal) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyPaddingRight = body.style.paddingRight;
      const scrollBarWidth = window.innerWidth - html.clientWidth;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }

      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
      };
    }
  }, [showDeleteModal, showRestoreModal, showRollbackModal, showPublishModal, showReuploadModal]);

  const handleDownload = async () => {
    try {
      const result = await getPatchDownloadUrl(patch.id);
      if (result.ok) {
        window.open(result.url, "_blank");
      } else {
        alert(result.error || "Failed to generate download URL");
      }
    } catch (error) {
      alert("Failed to download patch");
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const result = await archivePatchVersion(hackSlug, patch.id);
      if (result.ok) {
        setShowDeleteModal(false);
        onActionComplete();
      } else {
        alert(result.error || "Failed to archive version");
      }
    } catch (error) {
      alert("Failed to archive version");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const result = await restorePatchVersion(hackSlug, patch.id);
      if (result.ok) {
        setShowRestoreModal(false);
        onActionComplete();
      } else {
        alert(result.error || "Failed to restore version");
      }
    } catch (error) {
      alert("Failed to restore version");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    setActionLoading(true);
    try {
      const result = await rollbackToVersion(hackSlug, patch.id);
      if (result.ok) {
        setShowRollbackModal(false);
        onActionComplete();
      } else {
        alert(result.error || "Failed to rollback version");
      }
    } catch (error) {
      alert("Failed to rollback version");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    setActionLoading(true);
    try {
      const result = await publishPatchVersion(hackSlug, patch.id);
      if (result.ok) {
        setShowPublishModal(false);
        onActionComplete();
      } else {
        alert(result.error || "Failed to publish version");
      }
    } catch (error) {
      alert("Failed to publish version");
    } finally {
      setActionLoading(false);
    }
  };

  async function onUploadPatch(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setChecksumStatus("validating");
      setChecksumError("");

      const patchFile = e.target.files?.[0] || null;
      if (!patchFile) {
        setChecksumStatus("idle");
        setChecksumError("");
        setReuploadFile(null);
        return;
      }

      if (!baseRomEntry) {
        setChecksumStatus("unknown");
        setChecksumError("A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.");
        setReuploadFile(patchFile);
        return;
      }

      // Verify that the patch is a valid BPS file for the selected base ROM
      const bps = BPS.fromFile(new BinFile(await patchFile.arrayBuffer()));
      if (bps.sourceChecksum === 0 || bps.sourceChecksum === undefined) {
        setChecksumStatus("unknown");
        setChecksumError("A checksum is not available to validate this patch file. Proceed at your own risk, or upload your modified ROM instead.");
        setReuploadFile(patchFile);
        return;
      }

      const baseRomChecksum = parseInt(baseRomEntry.crc32, 16);
      if (bps.sourceChecksum !== baseRomChecksum) {
        setChecksumStatus("invalid");
        setChecksumError("Checksum validation failed. The patch file is not compatible with the selected base ROM.");
        setReuploadFile(null);
        return;
      }

      // All checks passed, set the checksum status to valid
      setChecksumStatus("valid");
      setChecksumError("");
      setReuploadFile(patchFile);
    } catch (err: any) {
      setChecksumStatus("unknown");
      setChecksumError(err?.message || "Failed to validate patch file.");
      setReuploadFile(null);
    }
  }

  async function onUploadBaseRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenError("");
      const f = e.target.files?.[0];
      if (!f || !baseRom) return;
      const matchedId = await importUploadedBlob(f);
      if (!matchedId) {
        setGenError("That ROM doesn't match any supported base ROM.");
        return;
      }
      if (matchedId !== baseRom) {
        const matchedName = baseRoms.find(r => r.id === matchedId)?.name;
        const baseRomName = baseRomEntry?.name || baseRom;
        setGenError(`This ROM matches "${matchedName ?? matchedId}", but the form requires "${baseRomName}".`);
        return;
      }
      setBaseRomFile(f);
    } catch {
      setGenError("Failed to import base ROM.");
      setBaseRomFile(null);
    }
  }

  async function onGrantPermission() {
    if (!baseRom) return;
    await ensurePermission(baseRom, true);
  }

  async function onUploadModifiedRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenStatus("generating");
      setGenError("");

      const mod = e.target.files?.[0] || null;
      if (!mod || !baseRom) {
        setGenStatus("idle");
        return;
      }

      let baseFile = baseRomFile;
      if (!baseFile) {
        baseFile = await getFileBlob(baseRom);
      }
      if (!baseFile) {
        setGenStatus("error");
        setGenError("Base ROM not available. Please upload the base ROM first.");
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
      const fileName = hackSlug || "patch";
      const patchBin = patch.export(fileName);
      const out = new File([patchBin._u8array], `${fileName}.bps`, { type: 'application/octet-stream' });
      setReuploadFile(out);
      setGenStatus("ready");
    } catch (err: any) {
      setGenStatus("error");
      setGenError(err?.message || "Failed to generate patch.");
    }
  }

  const handleReupload = async () => {
    if (!reuploadFile) {
      setReuploadError("Please select a file");
      return;
    }

    setActionLoading(true);
    setReuploadError(null);
    try {
      const safeVersion = patch.version.replace(/[^a-zA-Z0-9._-]+/g, "-");
      const objectKey = `${hackSlug}-${safeVersion}-reupload-${Date.now()}.bps`;

      const presignResult = await reuploadPatchVersion(hackSlug, patch.id, objectKey);
      if (!presignResult.ok) {
        throw new Error(presignResult.error || "Failed to get upload URL");
      }

      // Upload file
      const uploadResponse = await fetch(presignResult.presignedUrl, {
        method: "PUT",
        body: reuploadFile,
        headers: { "Content-Type": "application/octet-stream" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Confirm upload
      const confirmResult = await confirmReuploadPatchVersion(hackSlug, patch.id, objectKey);
      if (confirmResult.ok) {
        setShowReuploadModal(false);
        setReuploadFile(null);
        onActionComplete();
      } else {
        throw new Error(confirmResult.error || "Failed to confirm upload");
      }
    } catch (error: any) {
      setReuploadError(error.message || "Failed to re-upload patch");
    } finally {
      setActionLoading(false);
    }
  };

  // Mobile: Use dropdown menu, Desktop: Show buttons
  // If archived, only show Download and Restore
  if (patch.archived) {
    return (
      <>
        {/* Desktop: Show buttons */}
        <div className="hidden sm:flex flex-wrap gap-1.5">
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
            title="Download"
          >
            <FaDownload size={12} />
            Download
          </button>

          <button
            onClick={() => setShowRestoreModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/50 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-600/20 transition-colors"
            title="Restore version"
          >
            <FaRotateLeft size={12} />
            Restore
          </button>
        </div>

        {/* Mobile: Use dropdown menu */}
        <Menu as="div" className="relative sm:hidden">
          <MenuButton
            aria-label="Version actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-[var(--border)] bg-[var(--surface-2)] text-foreground/80 hover:bg-[var(--surface-3)] hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
          >
            <FiMoreVertical size={16} />
          </MenuButton>

          <MenuItems
            transition
            className="absolute right-0 z-10 mt-2 w-48 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
          >
            <MenuItem
              as="button"
              onClick={handleDownload}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
            >
              <FaDownload size={14} />
              Download
            </MenuItem>

            <MenuItem
              as="button"
              onClick={() => setShowRestoreModal(true)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-emerald-600 data-focus:bg-emerald-600/10"
            >
              <FaRotateLeft size={14} />
              Restore
            </MenuItem>
          </MenuItems>
        </Menu>

        {/* Restore Modal */}
        {showRestoreModal && (
          <Modal
            title="Restore Version"
            onClose={() => !actionLoading && setShowRestoreModal(false)}
          >
            <p className="text-foreground/80 mb-4">
              Restore version <strong>{patch.version}</strong>? This will make it visible again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRestore}
                disabled={actionLoading}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Restoring..." : "Restore"}
              </button>
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={actionLoading}
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}
      </>
    );
  }

  // Non-archived patches: show all buttons
  return (
    <>
      {/* Desktop: Show buttons */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {!patch.published && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/50 bg-emerald-600/10 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-600/20 transition-colors"
            title="Publish"
          >
            <FaCheck size={12} />
            Publish
          </button>
        )}

        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
          title="Download"
        >
          <FaDownload size={12} />
          Download
        </button>

        <button
          onClick={() => setShowReuploadModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
          title="Re-upload patch file"
        >
          <FaUpload size={12} />
          Re-upload
        </button>

        {shouldShowRollback && (
          <button
            onClick={() => setShowRollbackModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
            title="Rollback to this version"
          >
            <FaRotateLeft size={12} />
            Rollback
          </button>
        )}

        {!isCurrent && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-600/50 bg-red-600/10 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-600/20 transition-colors"
            title="Archive version"
          >
            <FaTrash size={12} />
            Archive
          </button>
        )}
      </div>

      {/* Mobile: Use dropdown menu */}
      <Menu as="div" className="relative sm:hidden">
        <MenuButton
          aria-label="Version actions"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-[var(--border)] bg-[var(--surface-2)] text-foreground/80 hover:bg-[var(--surface-3)] hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
        >
          <FiMoreVertical size={16} />
        </MenuButton>

        <MenuItems
          transition
          className="absolute right-0 z-10 mt-2 w-48 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
        >
          {!patch.published && (
            <MenuItem
              as="button"
              onClick={() => setShowPublishModal(true)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-emerald-600 data-focus:bg-emerald-600/10"
            >
              <FaCheck size={14} />
              Publish
            </MenuItem>
          )}

          <MenuItem
            as="button"
            onClick={handleDownload}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
          >
            <FaDownload size={14} />
            Download
          </MenuItem>

          <MenuItem
            as="button"
            onClick={() => setShowReuploadModal(true)}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
          >
            <FaUpload size={14} />
            Re-upload
          </MenuItem>

          {(!isCurrent || shouldShowRollback) && (
            <>
              <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
              {shouldShowRollback && (
                <MenuItem
                  as="button"
                  onClick={() => setShowRollbackModal(true)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
                >
                  <FaRotateLeft size={14} />
                  Rollback
                </MenuItem>
              )}

              {!isCurrent && (
                <MenuItem
                  as="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-600 data-focus:bg-red-600/10"
                >
                  <FaTrash size={14} />
                  Archive
                </MenuItem>
              )}
            </>
          )}
        </MenuItems>
      </Menu>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          title="Archive Version"
          onClose={() => !actionLoading && setShowDeleteModal(false)}
        >
          <p className="text-foreground/80 mb-4">
            Are you sure you want to archive version <strong>{patch.version}</strong>? This will hide it from public view, but it can be restored later.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Archiving..." : "Archive"}
            </button>
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={actionLoading}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Rollback Modal */}
      {showRollbackModal && (
        <Modal
          title="Rollback to Version"
          onClose={() => !actionLoading && setShowRollbackModal(false)}
        >
          <p className="text-foreground/80 mb-4">
            Rollback to version <strong>{patch.version}</strong>? This will set this version as the current patch and unpublish all newer versions.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRollback}
              disabled={actionLoading}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Rolling back..." : "Rollback"}
            </button>
            <button
              onClick={() => setShowRollbackModal(false)}
              disabled={actionLoading}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <Modal
          title="Publish Version"
          onClose={() => !actionLoading && setShowPublishModal(false)}
        >
          <p className="text-foreground/80 mb-4">
            Publish version <strong>{patch.version}</strong>? This will make it viewable to the public along with its changelog.
          </p>
          <p className="text-sm text-foreground/60 mb-4">
            If this version is newer than the current patch, it will become the primary download used for all users.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePublish}
              disabled={actionLoading}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Publishing..." : "Publish"}
            </button>
            <button
              onClick={() => setShowPublishModal(false)}
              disabled={actionLoading}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Re-upload Modal */}
      {showReuploadModal && (
        <Modal
          title="Re-upload Patch File"
          onClose={() => {
            if (!actionLoading) {
              setShowReuploadModal(false);
              setReuploadFile(null);
              setReuploadError(null);
              setChecksumStatus("idle");
              setChecksumError("");
              setGenStatus("idle");
              setGenError("");
              setBaseRomFile(null);
              setPatchMode("bps");
            }
          }}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Provide patch <span className="text-red-500">*</span>
            </label>
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
                    onChange={onUploadPatch}
                    type="file"
                    accept=".bps"
                    className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer"
                  />
                  <p className="text-xs text-foreground/60">Upload a BPS patch file.</p>
                  {checksumStatus === "validating" && <div className="text-xs text-foreground/70">Validating checksum…</div>}
                  {checksumStatus === "valid" && <div className="text-xs text-emerald-400/90">Checksum valid.</div>}
                  {checksumStatus === "invalid" && !!checksumError && <div className="text-xs text-red-400">{checksumError}</div>}
                  {checksumStatus === "unknown" && !!checksumError && <div className="text-xs text-amber-400/90">{checksumError}</div>}
                </div>
              )}

              {patchMode === "rom" && (
                <div className="grid gap-3">
                  <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--surface-2)]/50">
                    <div className="text-xs text-foreground/75">Required base ROM</div>
                    <div className="mt-1 text-sm font-medium">{baseRomEntry ? `${baseRomEntry.name} (${baseRomEntry.platform})` : "Unknown base ROM"}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90" : baseRomNeedsPermission ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90" : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"}`}>
                        {baseRomReady ? "Ready" : baseRomNeedsPermission ? "Permission needed" : "Base ROM needed"}
                      </span>
                      {baseRomNeedsPermission && (
                        <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed">Grant permission</button>
                      )}
                      {baseRomMissing && (
                        <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                          <input
                            ref={baseRomInputRef}
                            type="file"
                            onChange={onUploadBaseRom}
                            accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
                            className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--border)]"
                          />
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
                    {genStatus === "ready" && reuploadFile && <div className="text-xs text-emerald-400/90">Patch ready: {reuploadFile.name}</div>}
                    {genStatus === "error" && !!genError && <div className="text-xs text-red-400">{genError}</div>}
                  </div>
                </div>
              )}
            </div>
            {reuploadError && (
              <p className="mt-2 text-sm text-red-400">{reuploadError}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReupload}
              disabled={actionLoading || !reuploadFile || checksumStatus === "invalid"}
              className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setShowReuploadModal(false);
                setReuploadFile(null);
                setReuploadError(null);
                setChecksumStatus("idle");
                setChecksumError("");
                setGenStatus("idle");
                setGenError("");
                setBaseRomFile(null);
                setPatchMode("bps");
              }}
              disabled={actionLoading}
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed left-0 right-0 top-0 bottom-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-[101] card backdrop-blur-lg dark:!bg-black/70 p-6 max-w-md w-full rounded-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <FiX size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-4 pr-8">{title}</h2>
        {children}
      </div>
    </div>
  );
}


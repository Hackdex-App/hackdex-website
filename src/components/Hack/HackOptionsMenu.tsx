"use client";

import React, { useMemo, useState } from "react";
import { FiMoreVertical, FiEdit2, FiBarChart2, FiEyeOff, FiEye, FiTrash2 } from "react-icons/fi";
import { TbVersions } from "react-icons/tb";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import ReportModal from "@/components/Hack/ReportModal";
import Modal from "@/components/Primitives/Modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toggleHackVisibility, deleteHackFull } from "@/app/hack/[slug]/actions";

interface HackOptionsMenuProps {
  slug: string;
  canEdit: boolean;
  canUploadPatch: boolean;
  isHidden?: boolean;
  children?: React.ReactNode;
}

export default function HackOptionsMenu({
  slug,
  canEdit,
  canUploadPatch,
  isHidden = false,
  children,
}: HackOptionsMenuProps) {
  const router = useRouter();
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHideModal, setShowHideModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const hasRenderableChildren = useMemo(() => {
    return React.Children.toArray(children).some(Boolean);
  }, [children]);

  const handleToggleVisibility = async () => {
    setActionLoading(true);
    try {
      const result = await toggleHackVisibility(slug, !isHidden);
      if (result.ok) {
        toast.success(isHidden ? "Hack is now public." : "Hack is now hidden.");
        setShowHideModal(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update visibility.");
      }
    } catch (e) {
      toast.error("Connection error.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const result = await deleteHackFull(slug);
      if (result.ok) {
        toast.success("Hack permanently deleted.");
        setShowDeleteModal(false);
        router.push("/discover");
      } else {
        toast.error(result.error || "Failed to delete hack.");
      }
    } catch (e) {
      toast.error("Error processing deletion.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label="More options"
          title="Options"
          className="group inline-flex h-8 w-8 items-center justify-center rounded-md ring-1 ring-[var(--border)] bg-[var(--surface-2)] text-foreground/80 hover:bg-[var(--surface-3)] hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border)]"
        >
          <FiMoreVertical size={18} />
        </MenuButton>

        <MenuItems
          transition
          className="absolute right-0 z-10 mt-2 w-48 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
        >
          <MenuItem
            as="a"
            href={`/hack/${slug}/changelog`}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
          >
            Changelog
          </MenuItem>
          {!canUploadPatch && (
            <MenuItem
              as="a"
              href={`/hack/${slug}/versions`}
              className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
            >
              Version history
            </MenuItem>
          )}
          <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
          <MenuItem
            as="button"
            onClick={() => {
              setShowReportModal(true);
            }}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
          >
            Report
          </MenuItem>
          {canEdit && (
            <>
              <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
              <MenuItem
                as="a"
                href={`/hack/${slug}/stats`}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
              >
                <FiBarChart2 className="h-4 w-4" />
                Stats
              </MenuItem>
              <MenuItem
                as="a"
                href={`/hack/${slug}/edit`}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
              >
                <FiEdit2 className="h-4 w-4" />
                Edit
              </MenuItem>

              <MenuItem
                as="button"
                onClick={() => setShowHideModal(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
              >
                {isHidden ? <FiEye className="h-4 w-4" /> : <FiEyeOff className="h-4 w-4" />}
                {isHidden ? "Make public" : "Hide hack"}
              </MenuItem>
              
              <MenuItem
                as="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-red-600 data-focus:bg-red-600/10 dark:data-focus:bg-red-950/40"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete hack
              </MenuItem>
            </>
          )}
          {canUploadPatch && (
            <MenuItem
              as="a"
              href={`/hack/${slug}/versions`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10"
            >
              <TbVersions className="h-4 w-4" />
              Manage versions
            </MenuItem>
          )}
          {hasRenderableChildren && (
            <>
              <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
              {children}
            </>
          )}
        </MenuItems>
      </Menu>

      {showReportModal && (
        <ReportModal slug={slug} onClose={() => setShowReportModal(false)} />
      )}

      {canEdit && (
        <>
          <Modal
            title={isHidden ? "Make this hack public?" : "Hide this hack?"}
            visible={showHideModal}
            onClose={() => !actionLoading && setShowHideModal(false)}
          >
            <p className="text-foreground/80 mb-4 text-sm">
              {isHidden
                ? "If you make it public, it will reappear on the Discover page and anyone will be able to download it."
                : "If you hide it, it will disappear from the Discover page and only you (and admins) will be able to see it. You won't lose your downloads or data."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleToggleVisibility}
                disabled={actionLoading}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Processing..." : isHidden ? "Make public" : "Hide hack"}
              </button>
              <button
                onClick={() => setShowHideModal(false)}
                disabled={actionLoading}
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </Modal>

          <Modal
            title="Permanently Delete Hack"
            visible={showDeleteModal}
            onClose={() => !actionLoading && setShowDeleteModal(false)}
          >
            <p className="text-foreground/80 mb-4 text-sm">
              Are you absolutely sure you want to <strong>delete</strong> this hack? 
              All of its versions, images, and stats will be removed. 
              <span className="text-red-500 font-bold block mt-2">This action cannot be undone.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Deleting..." : "Delete permanently"}
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
        </>
      )}
    </>
  );
}
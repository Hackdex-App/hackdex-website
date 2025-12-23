"use client";

import React, { useState } from "react";
import { FiMoreVertical, FiEdit2, FiBarChart2 } from "react-icons/fi";
import { TbVersions } from "react-icons/tb";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import ReportModal from "@/components/Hack/ReportModal";

interface HackOptionsMenuProps {
  slug: string;
  canEdit: boolean;
  canUploadPatch: boolean;
  children?: React.ReactNode;
}

export default function HackOptionsMenu({
  slug,
  canEdit,
  canUploadPatch,
  children,
}: HackOptionsMenuProps) {
  const [showReportModal, setShowReportModal] = useState(false);

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
          className="absolute right-0 z-10 mt-2 w-42 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
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
          {canEdit && <>
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
          </>}
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
          {children && <>
            <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
            {children}
          </>}
        </MenuItems>
      </Menu>
      {showReportModal && (
        <ReportModal slug={slug} onClose={() => setShowReportModal(false)} />
      )}
    </>
  );
}



"use client";

import React, { useMemo, useState } from "react";
import { FiMoreVertical, FiEdit2, FiBarChart2 } from "react-icons/fi";
import { TbVersions } from "react-icons/tb";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import ReportModal from "@/components/Hack/ReportModal";

interface HackOptionsMenuProps {
  slug: string;
  canEdit: boolean;
  canUploadPatch: boolean;
  /** Where Edit goes: the in-place editor for regular hacks, the form for archives. */
  editHref: string;
  children?: React.ReactNode;
}

export default function HackOptionsMenu({
  slug,
  canEdit,
  editHref,
  canUploadPatch,
  children,
}: HackOptionsMenuProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  const hasRenderableChildren = useMemo(() => {
    return React.Children.toArray(children).some(Boolean);
  }, [children]);

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label="More options"
          title="Options"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface text-sm font-medium text-text-2 transition-colors hover:border-text-3 hover:text-text w-9"
        >
          <FiMoreVertical size={18} />
        </MenuButton>

        <MenuItems modal={false}
          transition
          className="absolute right-0 z-10 mt-2 w-44 origin-top-right overflow-hidden rounded-card border border-line bg-surface shadow-overlay focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
        >
          <MenuItem
            as="a"
            href={`/hack/${slug}/changelog`}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
          >
            Changelog
          </MenuItem>
          {!canUploadPatch && (
            <MenuItem
              as="a"
              href={`/hack/${slug}/versions`}
              className="block w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
            >
              Version history
            </MenuItem>
          )}
          <MenuSeparator className="my-1 h-px bg-line" />
          <MenuItem
            as="button"
            onClick={() => {
              setShowReportModal(true);
            }}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
          >
            Report
          </MenuItem>
          {canEdit && <>
            <MenuSeparator className="my-1 h-px bg-line" />
            <MenuItem
              as="a"
              href={`/hack/${slug}/stats`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
            >
              <FiBarChart2 className="h-4 w-4" />
              Stats
            </MenuItem>
            <MenuItem
              as="a"
              href={editHref}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
            >
              <FiEdit2 className="h-4 w-4" />
              Edit
            </MenuItem>
          </>}
          {canUploadPatch && (
            <MenuItem
              as="a"
              href={`/hack/${slug}/versions`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
            >
              <TbVersions className="h-4 w-4" />
              Manage versions
            </MenuItem>
          )}
          {hasRenderableChildren && <>
            <MenuSeparator className="my-1 h-px bg-line" />
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



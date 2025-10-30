"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FiMoreVertical } from "react-icons/fi";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";

interface HackOptionsMenuProps {
  slug: string;
  canEdit: boolean;
}

export default function HackOptionsMenu({ slug, canEdit }: HackOptionsMenuProps) {
  const router = useRouter();

  return (
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
        className="absolute right-0 z-10 mt-2 w-40 origin-top-right overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        <MenuItem
          as="button"
          onClick={() => {
          // TODO: Implement share
          }}
          className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10">
          Share
        </MenuItem>
        <MenuItem
          as="button"
          onClick={() => {
            // TODO: Implement report
          }}
          className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10">
          Report
        </MenuItem>
        {canEdit && <>
          <MenuSeparator className="my-1 h-px bg-[var(--border)]" />
          <MenuItem
            as="a"
            href={`/hack/${slug}/edit`}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10">
            Edit
          </MenuItem>
          <MenuItem
            as="a"
            href={`/hack/${slug}/edit/patch`}
            className="block w-full px-3 py-2 text-left text-sm data-focus:bg-black/5 dark:data-focus:bg-white/10">
            Upload new version
          </MenuItem>
        </>}
      </MenuItems>
    </Menu>
  );
}



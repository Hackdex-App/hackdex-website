"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FiMoreVertical } from "react-icons/fi";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator, Transition } from "@headlessui/react";

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

      <Transition
        as={React.Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems anchor="bottom end" className="mt-2 w-40 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] backdrop-blur-lg shadow-lg focus:outline-none">
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
          </>}
          {/* <MenuItem>
            <button
              className={`block w-full px-3 py-2 text-left text-sm data-focus:bg-[var(--surface-3)]`}
              onClick={() => {
                // TODO: Implement share
              }}
            >
              Share
            </button>
          </MenuItem>
          <MenuItem>
            <button
              className={`block w-full px-3 py-2 text-left text-sm data-focus:bg-[var(--surface-3)]`}
              onClick={() => {
                // TODO: Implement report
              }}
            >
              Report
            </button>
          </MenuItem>
          {canEdit && <div className="my-1 h-px bg-[var(--border)]" />}
          {canEdit && (
            <MenuItem>
              <a
                className={`block w-full px-3 py-2 text-left text-sm data-focus:bg-[var(--surface-3)]`}
                href={`/hack/${slug}/edit`}
              >
                Edit
              </a>
            </MenuItem>
          )} */}
        </MenuItems>
      </Transition>
    </Menu>
  );
}



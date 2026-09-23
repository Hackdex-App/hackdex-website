"use client";

import React from "react";
import { FiMoreVertical } from "react-icons/fi";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

export default function AccountOptionsMenu() {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="More options"
        title="Options"
        className="group inline-flex h-8 w-8 items-center justify-center rounded-control ring-1 ring-line bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line"
      >
        <FiMoreVertical size={18} />
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 w-56 origin-top-right overflow-hidden rounded-control border border-line bg-surface-2 backdrop-blur-lg shadow-lg focus:outline-none transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        <MenuItem
          as="a"
          href="/account/update-password?from=account"
          className="block w-full px-3 py-2 text-left text-sm data-focus:bg-surface-2"
        >
          Update password
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}



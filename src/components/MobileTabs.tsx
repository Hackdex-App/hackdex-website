"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { CartridgeIcon, GridIcon, HomeIcon } from "@/components/Icons";

/** Phone tab bar. Three tabs: players never need an account, so there is no Account tab. */
export default function MobileTabs() {
  const pathname = usePathname() ?? "/";
  const { countReady } = useBaseRoms();
  const tabs = [
    { href: "/", label: "Home", Icon: HomeIcon, active: pathname === "/" },
    { href: "/discover", label: "Discover", Icon: GridIcon, active: pathname.startsWith("/discover") },
    { href: "/roms", label: "My ROMs", Icon: CartridgeIcon, active: pathname.startsWith("/roms"), dot: countReady > 0 },
  ];
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map(({ href, label, Icon, active, dot }) => (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`flex flex-col items-center gap-1 pb-2 pt-2.5 text-xs font-semibold transition-colors ${
            active ? "text-accent-text" : "text-text-3"
          }`}
        >
          <span className="relative inline-flex">
            <Icon size={22} />
            {dot && (
              <span
                className="ready-dot absolute -right-[5px] -top-[3px] shadow-[0_0_0_2px_var(--surface)]"
                role="img"
                aria-label="A base ROM is ready"
              />
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

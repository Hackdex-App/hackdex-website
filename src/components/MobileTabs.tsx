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
    { href: "/roms", label: "My ROMs", Icon: CartridgeIcon, active: pathname.startsWith("/roms"), count: countReady },
  ];
  return (
    <nav
      id="mobile-tabs"
      aria-label="Primary"
      className="sticky bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {tabs.map(({ href, label, Icon, active, count }) => (
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
            {count ? (
              <span
                className="absolute -right-[9px] -top-[5px] inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ready px-[5px] text-[11px] font-bold leading-none tabular-nums text-on-ready shadow-[0_0_0_2px_var(--surface)]"
                role="img"
                aria-label={`${count} base ROM${count === 1 ? "" : "s"} ready`}
              >
                {count}
              </span>
            ) : null}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

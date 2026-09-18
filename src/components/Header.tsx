"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import Avatar from "@/components/Account/Avatar";
import ThemeToggle from "@/components/ThemeToggle";

/** Element id the hack page portals its compact title + action bar into once the patch module scrolls away. */
export const HEADER_COMPACT_ID = "site-header-compact";

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 border-y-2 border-transparent px-2.5 font-medium transition-colors hover:text-text ${
        active ? "border-b-accent text-text" : "text-text-2"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Site chrome. Rose appears only as the logo and the active-page indicator;
 * the rest is quiet so the one patch action owns the color on task pages.
 * Guests see no login: only creators need an account, and it lives behind Submit.
 */
export default function Header() {
  const { countReady } = useBaseRoms();
  const { user } = useAuthContext();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(data.user?.id ?? null);
      if (data.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", data.user.id).single();
        if (isMounted) setAvatarUrl(profile?.avatar_url ?? null);
      } else {
        setAvatarUrl(null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const query = typeof q === "string" ? q.trim() : "";
    router.push(query ? `/discover?q=${encodeURIComponent(query)}` : "/discover");
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-surface">
      <div className="relative mx-auto flex h-14 max-w-[1164px] items-center gap-3 px-6 md:h-[60px] md:gap-7">
        <Link href="/" className="inline-flex items-center gap-2.5 font-display text-[19px]" aria-label="Hackdex home">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-[7px]" />
          <span>Hackdex</span>
        </Link>

        <nav className="hidden self-stretch gap-1 md:flex" aria-label="Primary">
          <NavLink href="/discover" active={pathname.startsWith("/discover")}>
            Discover
          </NavLink>
          <NavLink href="/roms" active={pathname.startsWith("/roms")}>
            My ROMs
            {countReady > 0 && <span className="ready-dot" role="img" aria-label={`${countReady} base ROM${countReady === 1 ? "" : "s"} ready`} />}
          </NavLink>
        </nav>

        <form role="search" onSubmit={onSearch} className="relative ml-auto hidden text-text-3 md:block">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2" />
          <input
            type="search"
            name="q"
            placeholder="Search hacks"
            aria-label="Search hacks"
            className="h-[38px] w-[280px] rounded-control border border-transparent bg-surface-2 pl-[38px] pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-3 focus:border-accent focus:bg-surface lg:w-[320px]"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          <Link
            href="/submit"
            className="hidden h-[38px] items-center rounded-control px-2.5 font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text md:inline-flex"
          >
            Submit a hack
          </Link>
          {userId && (
            <Link
              href="/dashboard"
              aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
              className="group relative inline-flex items-center justify-center rounded-full p-[2px] ring-1 ring-line aria-[current=page]:ring-2 aria-[current=page]:ring-accent"
              aria-label="Open dashboard"
              title="Dashboard"
            >
              <Avatar uid={userId} url={avatarUrl} size={32} />
              <div className="absolute inset-0 m-[2px] rounded-full bg-transparent transition-colors group-hover:bg-black/20" />
            </Link>
          )}
        </div>

        {/* Hack page portals its compact title + action bar here; hidden while empty. */}
        <div id={HEADER_COMPACT_ID} className="absolute inset-0 empty:hidden" />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import Avatar from "@/components/Account/Avatar";

function NavLink({ href, label, className = "" }: { href: string; label: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      data-active={isActive || undefined}
      className={`group rounded-md px-3 py-2 text-sm transition-colors text-foreground/80 hover:bg-[var(--surface-2)] underline-offset-5 decoration-2 decoration-[var(--accent)] ${
        isActive ? "underline font-semibold" : ""
      } ${className}`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const { countReady } = useBaseRoms();
  const { user } = useAuthContext();
  const pathname = usePathname();
  const supabase = createClient();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const authed = Boolean(data.user);
      setIsAuthenticated(authed);
      setUserId(data.user?.id ?? null);
      // Best-effort fetch profile avatar_url for header avatar
      if (authed && data.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single();
        setAvatarUrl(profile?.avatar_url ?? null);
      } else {
        setAvatarUrl(null);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [supabase, user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-700)] ring-1 ring-[var(--border)]" />
          <span className="text-[15px] font-semibold tracking-tight hover:opacity-90 transition-opacity">Hackdex</span>
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          <NavLink href="/discover" label="Discover" />
          <NavLink
            href="/roms"
            label={
              <span className="inline-flex items-center gap-2">
                <span className="decoration-2 decoration-[var(--accent)] group-data-active:underline">My Base ROMs</span>
                <span className="inline-flex items-center rounded-full bg-emerald-600/60 px-2 py-0.5 text-xs text-white font-semibold ring-1 ring-emerald-700/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30">
                  {countReady}
                </span>
              </span>
            }
          />
          <Link
            href="/submit"
            className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] ${
              pathname === "/submit" ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)] brightness-110" : ""
            }`}
          >
            Submit
          </Link>
          {isAuthenticated && (
            <Link
              href="/account"
              className="ml-1 inline-flex items-center justify-center rounded-full ring-1 ring-[var(--border)] p-[2px] hover:bg-[var(--surface-2)]"
              aria-label="Open account"
              title="Account"
            >
              <Avatar uid={userId} url={avatarUrl} size={28} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}



"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import Avatar from "@/components/Account/Avatar";

function NavLink({ href, label, className = "", onClick }: { href: string; label: React.ReactNode; className?: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      data-active={isActive || undefined}
      onClick={onClick}
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState<boolean>(false);

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

  // Close mobile menu on route change for better UX
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock background scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isMobileMenuOpen]);

  // Close on Escape key
  React.useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-700)] ring-1 ring-[var(--border)]" />
          <span className="text-[15px] font-semibold tracking-tight hover:opacity-90 transition-opacity">Hackdex</span>
        </Link>

        <div className="flex items-center">
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
            <NavLink
              href="/submit"
              label="Submit"
              className="inline-flex h-9 items-center justify-center rounded-full font-semibold text-[var(--accent)] ring-1 ring-[var(--accent)] hover:bg-[var(--accent)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            {isAuthenticated && (
              <Link
                href="/account"
                data-active={pathname === "/account" || undefined}
                className="ml-1 relative group inline-flex items-center justify-center rounded-full ring-1 ring-[var(--border)] p-[2px] data-active:ring-2 data-active:ring-[var(--ring)]"
                aria-label="Open account"
                title="Account"
              >
                <Avatar uid={userId} url={avatarUrl} size={36} />
                <div className="absolute inset-0 rounded-full bg-transparent group-hover:bg-black/30 transition-colors m-[2px]" />
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ml-2"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M6.225 4.811a1 1 0 0 1 1.414 0L12 9.172l4.361-4.361a1 1 0 1 1 1.414 1.414L13.414 10.586l4.361 4.361a1 1 0 1 1-1.414 1.414L12 12l-4.361 4.361a1 1 0 0 1-1.414-1.414l4.361-4.361-4.361-4.361a1 1 0 0 1 0-1.414Z" clipRule="evenodd"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M3.75 6.75A.75.75 0 0 1 4.5 6h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm0 5.25a.75.75 0 0 1 .75-.75h15a.75.75 0 0 1 0 1.5h-15a.75.75 0 0 1-.75-.75Zm.75 4.5a.75.75 0 0 0 0 1.5h15a.75.75 0 0 0 0-1.5h-15Z" clipRule="evenodd"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel (animated) */}
      <div
        className={`md:hidden fixed inset-x-0 top-16 z-40 border-b border-[var(--border)] bg-background shadow-sm overflow-hidden transition-all duration-200 ease-out ${
          isMobileMenuOpen ? "max-h-[70vh] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1"
        }`}
        id="mobile-nav"
        role="menu"
        aria-label="Main menu"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="px-4 py-2 mb-4">
          <div className="flex flex-col gap-1">
            <NavLink href="/discover" label="Discover" className="text-[15px] py-3" onClick={() => setIsMobileMenuOpen(false)} />
            <NavLink
              href="/roms"
              className="text-[15px] py-3"
              onClick={() => setIsMobileMenuOpen(false)}
              label={
                <span className="inline-flex items-center gap-2">
                  <span className="decoration-2 decoration-[var(--accent)] group-data-active:underline">My Base ROMs</span>
                  <span className="inline-flex items-center rounded-full bg-emerald-600/60 px-2 py-0.5 text-xs text-white font-semibold ring-1 ring-emerald-700/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30">
                    {countReady}
                  </span>
                </span>
              }
            />
            <NavLink
              href="/submit"
              label="Submit"
              className="text-[15px] py-3 rounded-full font-semibold text-[var(--accent)] ring-2 ring-[var(--accent)]/20 hover:bg-[var(--accent)]/10"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {isAuthenticated && (
              <Link
                href="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                data-active={pathname === "/account" || undefined}
                className="mt-1 inline-flex items-center gap-3 rounded-md px-3 py-3 ring-1 ring-[var(--border)]"
                aria-label="Open account"
                title="Account"
              >
                <Avatar uid={userId} url={avatarUrl} size={28} />
                <span className="text-[15px]">Account</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Scrim overlay */}
      <button
        type="button"
        aria-hidden={!isMobileMenuOpen}
        aria-label="Close menu"
        title="Close menu"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        className={`md:hidden fixed inset-0 top-16 h-screen z-30 bg-black/50 transition-opacity duration-200 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
    </header>
  );
}



"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useBaseRoms } from "@/contexts/BaseRomContext";

function NavLink({ href, label, className = "" }: { href: string; label: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm transition-colors ${
        isActive ? "bg-[var(--surface-2)] text-[var(--foreground)] ring-1 ring-[var(--border)]" : "text-foreground/80 hover:bg-[var(--surface-2)]"
      } ${className}`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const { countReady } = useBaseRoms();
  const pathname = usePathname();
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
                <span>My Base ROMs</span>
                <span className="inline-flex items-center rounded-full bg-emerald-600/60 px-2 py-0.5 text-xs text-white ring-1 ring-emerald-700/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30">
                  {countReady}
                </span>
              </span>
            }
            className="border border-[var(--border)] bg-[var(--surface-2)] text-foreground"
          />
          <Link
            href="/submit"
            className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-semibold transition-colors bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-700)] ${
              pathname === "/submit" ? "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--background)] brightness-110" : ""
            }`}
          >
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}



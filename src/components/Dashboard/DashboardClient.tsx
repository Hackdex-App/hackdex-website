"use client";

import React from "react";
import Link from "next/link";
import type { DownloadsSeriesAll } from "@/app/dashboard/actions";
import { DashboardProvider } from "@/contexts/DashboardContext";
import DownloadsChart from "@/components/Dashboard/DownloadsChart";
import HackList from "@/components/Dashboard/HackList";

type HackRow = {
  slug: string;
  title: string;
  approved: boolean;
  updated_at: string | null;
  downloads: number;
  current_patch: number | null;
  version: string;
  created_at: string;
};

export default function DashboardClient({
  hacks,
  initialSeriesAll,
  displayName,
}: {
  hacks: HackRow[];
  initialSeriesAll: DownloadsSeriesAll;
  displayName: string;
}) {
  const [selectedSlugs, setSelectedSlugs] = React.useState<string[]>(() => hacks.map((h) => h.slug));

  const totalDownloads = React.useMemo(() => hacks.reduce((acc, h) => acc + (h.downloads || 0), 0), [hacks]);
  const pendingCount = hacks.filter((h) => !h.approved).length;
  const localCutover = React.useMemo(() => {
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(utcMidnight);
  }, []);

  return (
    <DashboardProvider initialSeriesAll={initialSeriesAll}>
      <div className="mx-auto max-w-screen-2xl">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 lg:gap-4">
          <div className="flex flex-col grow-1">
            <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
            <p className="mt-1 text-[18px] text-foreground/90">Welcome back, {displayName}!</p>
            <p className="mt-4 text-[15px] text-foreground/60">
              Analytics update daily at 00:00 UTC. Today&apos;s data will be available after {localCutover}.
            </p>
          </div>
          <div className="flex flex-col ml-auto my-4 w-full md:flex-row md:w-auto md:mb-0 lg:my-0 gap-2">
            <Link
              href="/account"
              className="inline-flex h-12 px-4 items-center justify-center w-full md:w-auto md:h-10 rounded-md text-sm font-medium ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)] hover:cursor-pointer"
            >
              Account Settings
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-12 px-8 items-center justify-center w-full md:w-auto md:h-10 rounded-md border border-red-600/40 bg-red-600/5 dark:border-red-400/40 dark:bg-red-400/5 text-sm font-medium text-red-600/90 dark:text-red-400/80 transition-colors hover:bg-red-600/5 dark:hover:bg-red-400/10 hover:cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Your hacks" value={hacks.length} />
          <StatCard label="Pending approval" value={pendingCount} />
          <StatCard label="Total downloads" value={totalDownloads} />
          <StatCard label="Last 30 days (UTC)" value={initialSeriesAll.datasets.reduce((acc, d) => acc + d.counts.reduce((a, b) => a + b, 0), 0)} />
        </div>

        {/* Downloads over time */}
        <div className="mt-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Downloads over time (last 30 days, UTC)</h2>
            <SlugMultiSelect
              hacks={hacks}
              values={selectedSlugs}
              onChange={setSelectedSlugs}
            />
          </div>
          <div className="mt-4">
            <DownloadsChart selectedSlugs={selectedSlugs} />
          </div>
        </div>

        {/* Hacks list */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold">Your hacks</h2>
          <HackList hacks={hacks} />
        </div>

        {/* Per-hack insights removed; deeper stats are on each hack's /stats page */}
      </div>
    </DashboardProvider>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="text-[13px] text-foreground/70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SlugMultiSelect({
  hacks,
  values,
  onChange,
}: {
  hacks: HackRow[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full -mx-1 px-1">
      {hacks.map((h) => {
        const selected = values.includes(h.slug);
        return (
          <button
            key={h.slug}
            type="button"
            onClick={() => onChange(selected ? values.filter((s) => s !== h.slug) : [...values, h.slug])}
            className={`shrink-0 rounded-full px-3 py-2 text-sm ring-1 ring-inset transition-colors hover:cursor-pointer ${
              selected
                ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35"
                : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {h.title}
          </button>
        );
      })}
      {hacks.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(hacks.map((h) => h.slug))}
          className="shrink-0 rounded-full ml-auto px-3 py-2 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 hover:cursor-pointer"
        >
          Select all
        </button>
      )}
      {values.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className={`shrink-0 rounded-full px-3 py-2 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 hover:cursor-pointer ${values.length === 0 ? "ml-auto" : ""}`}
        >
          Clear
        </button>
      )}
    </div>
  );
}



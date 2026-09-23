"use client";

import React from "react";
import Link from "next/link";
import type { DownloadsSeriesAll } from "@/app/dashboard/actions";
import { DashboardProvider } from "@/contexts/DashboardContext";
import DownloadsChart from "@/components/Dashboard/DownloadsChart";
import HackList from "@/components/Dashboard/HackList";

export type HackRow = {
  slug: string;
  title: string;
  approved: boolean;
  submitted_at: string | null;
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
  const pendingCount = hacks.filter((h) => !h.approved && h.submitted_at !== null).length;
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
            <h1 className="font-display text-[28px] leading-tight md:text-[32px]">Creator dashboard</h1>
            <p className="mt-1 text-[17px] text-text-2">Welcome back, {displayName}!</p>
            <p className="mt-3 text-[13px] text-text-3">
              Analytics update daily at 00:00 UTC. Today&apos;s data will be available after {localCutover}.
            </p>
          </div>
          <div className="flex flex-col ml-auto my-4 w-full md:flex-row md:w-auto md:mb-0 lg:my-0 gap-2">
            <Link
              href="/account"
              className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong bg-surface px-4 text-sm font-medium transition-colors hover:border-text-3 md:h-10 md:w-auto"
            >
              Account Settings
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-control border border-error/40 bg-surface px-6 text-sm font-medium text-error transition-colors hover:bg-error-soft md:h-10 md:w-auto"
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
      </div>
    </DashboardProvider>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-rest">
      <div className="text-[13px] text-text-3">{label}</div>
      <div className="mt-1 font-display text-2xl tabular-nums">{value}</div>
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
                ? "bg-accent-deep/15 text-[var(--foreground)] ring-[var(--accent)]/35"
                : "bg-surface-2 text-text-2 ring-line hover:bg-surface-2"
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
          className="shrink-0 rounded-full ml-auto px-3 py-2 text-sm ring-1 ring-inset transition-colors bg-surface-2 text-text-2 ring-line hover:bg-surface-2 hover:cursor-pointer"
        >
          Select all
        </button>
      )}
      {values.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className={`shrink-0 rounded-full px-3 py-2 text-sm ring-1 ring-inset transition-colors bg-surface-2 text-text-2 ring-line hover:bg-surface-2 hover:cursor-pointer ${values.length === 0 ? "ml-auto" : ""}`}
        >
          Clear
        </button>
      )}
    </div>
  );
}



"use client";

import React from "react";
import Link from "next/link";
import type { DownloadsSeriesAll, HackInsights } from "@/app/dashboard/actions";
import HackStatsCharts from "@/components/Hack/Stats/HackStatsCharts";

export default function HackStatsClient({
  slug,
  title,
  initialSeries,
  initialInsights,
}: {
  slug: string;
  title: string;
  initialSeries: DownloadsSeriesAll;
  initialInsights: HackInsights;
}) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "versions">("overview");
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setIsMobile(window.innerWidth < 1024);
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stats: {title}</h1>
          <p className="mt-2 text-[15px] text-foreground/80">Analytics update daily at 00:00 UTC. Today&apos;s data appears tomorrow.</p>
        </div>
        <Link href={`/hack/${slug}`} className="inline-flex h-10 items-center rounded-md px-4 text-sm ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]">Back to hack</Link>
      </div>

      {/* Mobile segmented control */}
      {isMobile && (
        <div className="mt-4" role="tablist" aria-label="Stats tabs">
          <div className="inline-flex rounded-md ring-1 ring-[var(--border)] p-0.5">
            <button
              role="tab"
              aria-selected={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-sm rounded ${activeTab === "overview" ? "bg-[var(--surface-2)]" : "text-foreground/70"}`}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "versions"}
              onClick={() => setActiveTab("versions")}
              className={`px-3 py-1.5 text-sm rounded ${activeTab === "versions" ? "bg-[var(--surface-2)]" : "text-foreground/70"}`}
            >
              Versions
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <HackStatsCharts series={initialSeries} insights={initialInsights} activeTab={isMobile ? activeTab : undefined} />
      </div>
    </div>
  );
}



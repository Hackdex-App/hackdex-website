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
          <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px]">Stats: {title}</h1>
          <p className="mt-2 text-[15px] text-text-2">Analytics update daily at 00:00 UTC. Today&apos;s data appears tomorrow.</p>
        </div>
        <Link href={`/hack/${slug}`} className="inline-flex h-10 items-center rounded-control px-4 text-sm ring-1 ring-line hover:bg-surface-2">Back to hack</Link>
      </div>

      {/* Mobile segmented control */}
      {isMobile && (
        <div className="mt-4" role="tablist" aria-label="Stats tabs">
          <div className="inline-flex rounded-control ring-1 ring-line p-0.5">
            <button
              role="tab"
              aria-selected={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 text-sm rounded ${activeTab === "overview" ? "bg-surface-2" : "text-text-2"}`}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "versions"}
              onClick={() => setActiveTab("versions")}
              className={`px-3 py-1.5 text-sm rounded ${activeTab === "versions" ? "bg-surface-2" : "text-text-2"}`}
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



"use client";

import React from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  ChartData,
  ChartDataset,
  ChartOptions,
} from "chart.js";
import type { DownloadsSeriesAll, HackInsights } from "@/app/dashboard/actions";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler, BarElement);
type LineData = ChartData<"line", number[], string>;
type BarData = ChartData<"bar", (number | [number, number] | null)[], unknown>;

interface HackStatsChartsProps {
  series: DownloadsSeriesAll;
  insights: HackInsights;
  activeTab?: "overview" | "versions";
}

export default function HackStatsCharts({ series, insights, activeTab }: HackStatsChartsProps) {
  const lineData: LineData = React.useMemo(() => ({
    labels: series.labels,
    datasets: series.datasets.map((d, i) => ({
      label: d.slug,
      data: d.counts,
      borderColor: "#22c55e",
      backgroundColor: "#22c55e33",
      fill: true,
      tension: 0.25,
      pointRadius: 2,
    }) satisfies ChartDataset<"line">),
  }) satisfies LineData, [series]);

  const lineOptions: ChartOptions<"line"> = React.useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true } },
  }) satisfies ChartOptions<"line">, []);

  const barData: BarData = React.useMemo(() => ({
    labels: insights.versionCounts.map((v) => v.version),
    datasets: [{ label: "Downloads", data: insights.versionCounts.map((v) => v.downloads), backgroundColor: "#3b82f6" }],
  }) satisfies BarData, [insights]);

  // Mobile: show one chart by tab; Desktop: show both
  if (activeTab) {
    return (
      <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-3 md:gap-6">
        {activeTab === "overview" ? (
          <div className="md:col-span-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="mb-2 text-sm font-medium">Downloads over time (last 30 days, UTC)</div>
            <div className="h-[60vh] sm:h-72 max-w-full overflow-hidden">
              {series.datasets.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-foreground/70">No data yet.</div>
              ) : (
                <Line data={lineData} options={lineOptions} className="!w-full !h-full block" style={{ width: "100%", height: "100%" }} />
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="mb-2 text-sm font-medium">Latest-version adoption</div>
              {insights.isNewToday ? (
                <div className="text-sm text-foreground/70">New upload today—please check back tomorrow (UTC) for analytics.</div>
              ) : (
                <div>
                  <div className="text-4xl font-semibold">{Math.round(insights.adoptionRate * 100)}%</div>
                  <div className="mt-1 text-xs text-foreground/70">{insights.latestUniqueDevices} of {insights.totalUniqueDevices} unique devices on latest</div>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="mb-2 text-sm font-medium">Downloads per version (all-time)</div>
              <div className="h-[50vh] sm:h-64">
                {insights.versionCounts.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-foreground/70">No downloads yet.</div>
                ) : (
                  <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <div className="mb-2 text-sm font-medium">Downloads over time (last 30 days, UTC)</div>
        <div className="h-72 max-w-full overflow-hidden">
          {series.datasets.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/70">No data yet.</div>
          ) : (
            <Line data={lineData} options={lineOptions} className="!w-full !h-full block" style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <div className="mb-2 text-sm font-medium">Latest-version adoption</div>
        {insights.isNewToday ? (
          <div className="text-sm text-foreground/70">New upload today—please check back tomorrow (UTC) for analytics.</div>
        ) : (
          <div>
            <div className="text-4xl font-semibold">{Math.round(insights.adoptionRate * 100)}%</div>
            <div className="mt-1 text-xs text-foreground/70">{insights.latestUniqueDevices} of {insights.totalUniqueDevices} unique devices on latest</div>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 lg:col-span-3">
        <div className="mb-2 text-sm font-medium">Downloads per version (all-time)</div>
        <div className="h-64">
          {insights.versionCounts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/70">No downloads yet.</div>
          ) : (
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }} />
          )}
        </div>
      </div>
    </div>
  );
}



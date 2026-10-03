"use client";

import React from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface HackRow {
  slug: string;
  title: string;
  approved: boolean;
  updated_at: string | null;
  downloads: number;
  current_patch: number | null;
  version: string;
  created_at: string;
}

export default function HackInsights({ hack }: { hack: HackRow }) {
  const { getInsights } = useDashboard();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<null | Awaited<ReturnType<typeof getInsights>>>(null);

  React.useEffect(() => {
    if (!open || data) return;

    let mounted = true;
    setLoading(true);
    getInsights(hack.slug)
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [open, data, getInsights, hack.slug]);

  return (
    <div className="rounded-card border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-2"
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{hack.title}</div>
          <div className="mt-0.5 text-xs text-text-3">/{hack.slug}</div>
        </div>
        <div className="text-sm text-text-2">{open ? "Hide" : "Show"} insights</div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {loading || !data ? (
            <div className="py-6 text-sm text-text-2">Loading insights…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="md:col-span-2 rounded-control border border-line bg-surface-2 p-3">
                <div className="text-sm font-medium mb-2">Downloads per version</div>
                {data.versionCounts.length === 0 ? (
                  <div className="text-sm text-text-2">No downloads yet. Upload a patch to see data.</div>
                ) : (
                  <Bar
                    data={{
                      labels: data.versionCounts.map((v) => v.version),
                      datasets: [
                        {
                          label: "Downloads",
                          data: data.versionCounts.map((v) => v.downloads),
                          backgroundColor: "#3b82f6",
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true } },
                    }}
                    height={220}
                  />
                )}
              </div>
              <div className="rounded-control border border-line bg-surface-2 p-3">
                <div className="text-sm font-medium mb-2">Latest-version adoption</div>
                {data.isNewToday ? (
                  <div className="text-sm text-text-2">New upload today—please check back tomorrow (UTC) for analytics.</div>
                ) : (
                  <div>
                    <div className="text-3xl font-semibold">{Math.round(data.adoptionRate * 100)}%</div>
                    <div className="mt-1 text-xs text-text-2">{data.latestUniqueDevices} of {data.totalUniqueDevices} unique devices on latest</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { useDashboard } from "@/contexts/DashboardContext";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

export default function DownloadsChart({ selectedSlugs }: { selectedSlugs: string[] }) {
  const { seriesAllHacks } = useDashboard();

  const palette = React.useMemo(
    () => [
      "#22c55e",
      "#3b82f6",
      "#f59e0b",
      "#ef4444",
      "#a855f7",
      "#06b6d4",
    ],
    []
  );

  const datasets = React.useMemo(() => {
    const filtered = seriesAllHacks.datasets.filter((d) => selectedSlugs.includes(d.slug));
    return filtered.map((d, idx) => {
      const color = palette[idx % palette.length];
      return {
        label: d.slug,
        data: d.counts,
        borderColor: color,
        backgroundColor: color + "33",
        fill: true,
        tension: 0.25,
        pointRadius: 2,
      } as const;
    });
  }, [seriesAllHacks.datasets, selectedSlugs, palette]);

  const data = React.useMemo(() => {
    const years = new Set(seriesAllHacks.labels.map((ds) => Number(ds.slice(0, 4))));
    // Format YYYY-MM-DD to "06 Oct" or "Oct 06" depending on locale (always treat as UTC)
    const labels = seriesAllHacks.labels.map((dateStr, i) => {
      // Directly parse components from YYYY-MM-DD string to avoid timezone conversion
      const [yearStr, monthStr, dayStr] = dateStr.split("-");
      const year = Number(yearStr);
      const month = Number(monthStr); // 1-based
      const day = Number(dayStr);

      // Show the year if it's the first/second of January and years are not all the same
      // Two days because maxTicksLimit is half of the label count.
      let shouldShowYear = false;
      if (i === 0 || (day === 1 && month === 1) || (day === 2 && month === 1)) {
        if (years.size > 1 && month === 1 && day === 1) {
          shouldShowYear = true;
        }
      }

      // Build a GMT Date so locale options format, but still UTC.
      // month-1 because Date.UTC months are zero-based.
      const d = new Date(Date.UTC(year, month - 1, day));

      let baseFormat = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "2-digit",
        timeZone: "UTC",
      }).format(d);

      if (shouldShowYear) {
        baseFormat += ` ${year}`;
      }
      return baseFormat;
    });

    return {
      labels,
      datasets,
    };
  }, [seriesAllHacks.labels, datasets]);

  const options: ChartOptions<"line"> = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            footer: (items: any[]) => {
              try {
                const sum = items.reduce((acc, it) => acc + (Number(it.parsed.y) || 0), 0);
                return `Total: ${sum}`;
              } catch {
                return "";
              }
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { autoSkip: true, maxTicksLimit: 15 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(0,0,0,0.1)" },
        },
      },
    }),
    []
  );

  return (
    <div className="h-[40vh] sm:h-72 w-full max-w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      {datasets.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-foreground/70">Select at least one hack to display.</div>
      ) : (
        <Line data={data} options={options} className="!w-full !h-full block" style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}



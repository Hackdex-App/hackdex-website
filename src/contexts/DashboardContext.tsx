"use client";

import React from "react";
import type { DownloadsSeriesAll, HackInsights } from "@/app/dashboard/actions";
import { getHackInsights } from "@/app/dashboard/actions";

type DashboardContextValue = {
  seriesAllHacks: DownloadsSeriesAll;
  insightsBySlug: Map<string, HackInsights>;
  getInsights: (slug: string) => Promise<HackInsights>;
};

export const DashboardContext = React.createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  children,
  initialSeriesAll,
}: {
  children: React.ReactNode;
  initialSeriesAll: DownloadsSeriesAll;
}) {
  const insightsRef = React.useRef<Map<string, HackInsights>>(new Map());

  const getInsights = React.useCallback(async (slug: string) => {
    const cached = insightsRef.current.get(slug);
    if (cached) return cached;
    const result = await getHackInsights({ slug });
    insightsRef.current.set(slug, result);
    return result;
  }, []);

  const value = React.useMemo<DashboardContextValue>(() => ({
    seriesAllHacks: initialSeriesAll,
    insightsBySlug: insightsRef.current,
    getInsights,
  }), [initialSeriesAll, getInsights]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = React.useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}



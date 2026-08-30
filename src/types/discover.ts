import type { HackCardAttributes } from "@/components/HackCard";

export type DiscoverSortOption = "trending" | "popular" | "new" | "updated" | "alpha";

export interface DiscoverHack extends HackCardAttributes {
  approvedAt: string | null;
  publishedAt: string | null;
  trendingScore: number;
}

export interface DiscoverData {
  hacks: DiscoverHack[];
  generatedAt: string;
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
}

import type { HackCardAttributes } from "@/components/HackCard";
import type { AiLevels } from "@/utils/aiDisclosure";

export type DiscoverSortOption = "trending" | "popular" | "new" | "updated" | "alpha";

export interface DiscoverHack extends HackCardAttributes {
  approvedAt: string | null;
  publishedAt: string | null;
  trendingScore: number;
  /** The AI label's level per area, for the AI filter; null until the creator fills it in. */
  ai: AiLevels | null;
}

export interface DiscoverData {
  hacks: DiscoverHack[];
  generatedAt: string;
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
}

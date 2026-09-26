import type { HackCardAttributes } from "@/components/HackCard";
import type { AiKind } from "@/utils/aiDisclosure";

export type DiscoverSortOption = "trending" | "popular" | "new" | "updated" | "alpha";

export interface DiscoverHack extends HackCardAttributes {
  approvedAt: string | null;
  publishedAt: string | null;
  trendingScore: number;
  /** The AI label's headline kind; null until the creator fills it in. */
  ai: AiKind | null;
}

export interface DiscoverData {
  hacks: DiscoverHack[];
  generatedAt: string;
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
}

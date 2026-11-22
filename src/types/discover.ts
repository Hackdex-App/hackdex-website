import type { HackCardAttributes } from "@/components/HackCard";
import type { AiLevels } from "@/utils/aiDisclosure";

export type DiscoverSortOption = "trending" | "popular" | "new" | "updated" | "alpha";

export interface DiscoverHack extends HackCardAttributes {
  curatedAt: string | null;
  /** Sorts uncurated hacks under "Newest", which have no curation date. */
  approvedAt: string | null;
  publishedAt: string | null;
  trendingScore: number;
  /** The AI label's level per area, for the AI filter; null until the creator fills it in. */
  ai: AiLevels | null;
}

export interface DiscoverData {
  /** Curated hacks: everything Discover and the homepage list. */
  hacks: DiscoverHack[];
  /** Approved hacks outside the curated collection. Discover shows them only when a search looks one up by name. */
  searchOnly: DiscoverHack[];
  generatedAt: string;
  tagGroups: Record<string, string[]>;
  ungroupedTags: string[];
}

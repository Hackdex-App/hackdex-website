/** Tag row for catalog UI and cached tag fetches (see src/data/tags.ts). */
export type CatalogTagRow = {
  id: number;
  name: string;
  category: string | null;
  popularity: number;
  created_at: string | null;
};

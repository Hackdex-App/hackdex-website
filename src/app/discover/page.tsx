import DiscoverBrowser from "@/components/Discover/DiscoverBrowser";
import type { Metadata } from "next";
import { getDiscoverData } from "./actions";
import { DISCOVER_DEFAULT_STATE } from "./search-params";

export const dynamic = "error";
export const revalidate = 1800;

export const metadata: Metadata = {
  description: "Find and download Pokémon romhacks for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.",
  alternates: {
    canonical: "/discover",
  },
};

export default async function DiscoverPage() {
  const { hacks, generatedAt, tagGroups, ungroupedTags } = await getDiscoverData();

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 pt-4 md:pt-6">
      <div className="mb-5 md:mb-6">
        <h1 className="font-display text-[28px] leading-tight md:text-[32px]">Discover ROM hacks</h1>
        <p className="mt-2 max-w-[70ch] text-[15px] text-text-2">
          Hackdex supports developers by only hosting hacks that have been uploaded by the person or team that created them. By using this site, you are supporting the original creators and their labors of love.
        </p>
      </div>
      <DiscoverBrowser
        catalog={hacks}
        generatedAt={generatedAt}
        initialState={DISCOVER_DEFAULT_STATE}
        tagGroups={tagGroups}
        ungroupedTags={ungroupedTags}
      />
    </div>
  );
}

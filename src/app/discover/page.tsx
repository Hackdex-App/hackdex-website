import DiscoverBrowser from "@/components/Discover/DiscoverBrowser";
import type { Metadata } from "next";
import { parseDiscoverSearchParams } from "./search-params";

export const metadata: Metadata = {
  description: "Find and download Pokémon romhacks for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.",
  alternates: {
    canonical: "/discover",
  },
};

interface DiscoverPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage(props: DiscoverPageProps) {
  const searchParams = await props.searchParams;
  const initialState = parseDiscoverSearchParams(searchParams);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover ROM hacks</h1>
          <p className="mt-2 text-[15px] text-foreground/80 max-w-198">
            Hackdex supports developers by only hosting hacks that have been uploaded by the person or team that created them. By using this site, you are supporting the original creators and their labors of love.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <DiscoverBrowser initialState={initialState} />
      </div>
    </div>
  );
}



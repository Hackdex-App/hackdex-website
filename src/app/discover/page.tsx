import DiscoverBrowser from "@/components/Discover/DiscoverBrowser";
import type { Metadata } from "next";

export const metadata: Metadata = {
  description: "Find and download Pokémon romhacks for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.",
  alternates: {
    canonical: "/discover",
  },
};

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover ROM hacks</h1>
          <p className="mt-2 text-[15px] text-foreground/80">
            Browse curated patches. See what others are downloading.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <DiscoverBrowser />
      </div>
    </div>
  );
}



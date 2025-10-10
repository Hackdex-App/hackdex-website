import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-screen-2xl px-6 py-8 text-sm text-foreground/70">
        <div className="flex items-start justify-between">
          <div>
            <p>© {new Date().getFullYear()} Hackdex</p>
            <p className="mt-2 max-w-2xl text-xs text-foreground/60">
              Pokémon, Nintendo, Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS are
              trademarks of their respective owners. Hackdex is an independent fan project and is not
              affiliated with, endorsed, or sponsored by Nintendo, The Pokémon Company, or GAME FREAK.
              Please support them by purchasing their most recent games.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/discover" className="hover:underline">
              Discover
            </Link>
            <Link href="/submit" className="hover:underline">
              Submit
            </Link>
            <Link href="/login" className="hover:underline font-medium text-foreground">
              Already a creator? Log in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}



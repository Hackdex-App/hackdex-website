import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-screen-2xl px-6 py-8 text-sm text-foreground/70">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p>© 2025 Hackdex</p>
            <p className="mt-2 max-w-2xl text-xs text-foreground/60">
              Pokémon, Nintendo, Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS are
              trademarks of their respective owners. Hackdex is an independent fan project and is not
              affiliated with, endorsed, or sponsored by Nintendo, The Pokémon Company, or GAME FREAK.
              Please support them by purchasing their most recent games.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-foreground/60">
              We host only patch files, never ROMs. When using our patcher, your legally-obtained ROMs never leave your device.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-x-12 gap-y-8 sm:gap-y-4 sm:grid-cols-2 md:grid-cols-3 md:min-w-[465px]">
            <div>
              <div className="mb-3 pb-2 border-b border-white/10 text-xs font-medium uppercase tracking-wider text-foreground/80">Platform</div>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <Link href="/discover" className="block py-1 hover:underline">Discover</Link>
                </li>
                <li>
                  <Link href="/submit" className="block py-1 hover:underline">Submit</Link>
                </li>
                <li>
                  <Link href="/login" className="block py-1 hover:underline">Log in</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-3 pb-2 border-b border-white/10 text-xs font-medium uppercase tracking-wider text-foreground/80">Legal</div>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <Link href="/terms" className="block py-1 hover:underline">Terms of Service</Link>
                </li>
                <li>
                  <Link href="/privacy" className="block py-1 hover:underline">Privacy Policy</Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-3 pb-2 border-b border-white/10 text-xs font-medium uppercase tracking-wider text-foreground/80">Support</div>
              <ul className="space-y-1.5 sm:space-y-2">
                <li>
                  <Link href="/faq" className="block py-1 hover:underline">FAQ</Link>
                </li>
                <li>
                  <Link href="/contact" className="block py-1 hover:underline">Contact</Link>
                </li>
                <li>
                  <Link href="https://github.com/Hackdex-App/hackdex-website" className="block py-1 hover:underline">GitHub</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}



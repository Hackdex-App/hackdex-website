import Image from "next/image";
import Link from "next/link";
import FooterAccountLinks from "@/components/FooterAccountLinks";

const PLAY = [
  { href: "/discover", label: "Discover" },
  { href: "/roms", label: "My ROMs" },
  { href: "/faq", label: "FAQ" },
];

const ABOUT = [
  { href: "/contact", label: "Contact" },
  { href: "https://github.com/orgs/Hackdex-App/projects/4", label: "Roadmap" },
  { href: "https://github.com/Hackdex-App/hackdex-website", label: "GitHub" },
];

// Footer links render on every page, so they skip viewport prefetch (it showed up as Edge Requests far above page views).
const FOOTER_LINK = "w-fit whitespace-nowrap py-[3px] hover:text-text hover:underline hover:underline-offset-[3px]";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col">
      <h2 className="mb-1.5 text-xs font-semibold text-text">{title}</h2>
      {children}
    </nav>
  );
}

/** Site footer: blurb and three link columns (Play / Create / Hackdex), then copyright, legal links, and trademarks. */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line text-[13px] text-text-2">
      {/* Phones: extra bottom room so the floating "How do I download?" pill on hack pages never covers the links. */}
      <div className="mx-auto max-w-[1164px] px-6 pb-24 pt-8 md:pb-10">
        <div className="grid grid-cols-[repeat(3,auto)] justify-between gap-x-4 gap-y-7 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-x-6">
          <div className="col-span-3 md:col-span-1">
            <Link href="/" prefetch={false} className="inline-flex items-center gap-2 font-display text-[16px] text-text">
              <Image src="/logo.png" alt="" width={22} height={22} className="rounded-[6px]" unoptimized />
              Hackdex
            </Link>
            <p className="mt-2 max-w-[34ch] text-text-3">Patch Pokémon ROM hacks in your browser. We host only patch files, never ROMs, and your ROMs never leave your device.</p>
          </div>
          <Column title="Play">
            {PLAY.map((l) => (
              <Link key={l.href} href={l.href} prefetch={false} className={FOOTER_LINK}>
                {l.label}
              </Link>
            ))}
          </Column>
          <Column title="Create">
            <Link href="/submit" prefetch={false} className={FOOTER_LINK}>
              Submit a hack
            </Link>
            <FooterAccountLinks className={FOOTER_LINK} />
          </Column>
          <Column title="Hackdex">
            {ABOUT.map((l) => (
              <Link key={l.href} href={l.href} prefetch={false} className={FOOTER_LINK}>
                {l.label}
              </Link>
            ))}
          </Column>
        </div>

        <div className="mt-8 border-t border-line pt-5">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span>© 2025-{new Date().getFullYear()} Hackdex</span>
            <Link href="/terms" prefetch={false} className={FOOTER_LINK}>
              Terms
            </Link>
            <Link href="/privacy" prefetch={false} className={FOOTER_LINK}>
              Privacy
            </Link>
          </p>
          <p className="mt-2 max-w-[90ch] text-xs text-text-3">
            Pokémon, Nintendo, Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS are trademarks of their
            respective owners. Hackdex is an independent fan project and is not affiliated with, endorsed, or
            sponsored by Nintendo, The Pokémon Company, or GAME FREAK. Please support them by purchasing their most
            recent games.
          </p>
        </div>
      </div>
    </footer>
  );
}

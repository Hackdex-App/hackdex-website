import Link from "next/link";
import FooterAccountLink from "@/components/FooterAccountLink";

const LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/submit", label: "Submit a hack" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "https://github.com/Hackdex-App/hackdex-website", label: "GitHub" },
  { href: "https://github.com/orgs/Hackdex-App/projects/4", label: "Roadmap" },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line text-[13px] text-text-2">
      {/* Phones: extra bottom room so the floating "How do I download?" pill on hack pages never covers the links. */}
      <div className="mx-auto flex max-w-[1164px] flex-col gap-4 px-6 pb-24 pt-6 md:flex-row md:items-baseline md:justify-between md:gap-10 md:pb-10">
        <div className="max-w-[62ch]">
          <p>© 2025-{new Date().getFullYear()} Hackdex</p>
          <p className="mt-2 text-xs text-text-3">
            Pokémon, Nintendo, Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS are trademarks of their
            respective owners. Hackdex is an independent fan project and is not affiliated with, endorsed, or
            sponsored by Nintendo, The Pokémon Company, or GAME FREAK. Please support them by purchasing their most
            recent games.
          </p>
          <p className="mt-2 text-xs text-text-3">
            We host only patch files, never ROMs. When using our patcher, your legally-obtained ROMs never leave your
            device.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-[18px] gap-y-2 whitespace-nowrap">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-text hover:underline hover:underline-offset-[3px]">
              {l.label}
            </Link>
          ))}
          <FooterAccountLink />
        </nav>
      </div>
    </footer>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-screen-2xl px-6 py-10 sm:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="gradient-text">Discover</span> and share Pokémon romhacks
            </h1>
            <p className="mt-4 text-[15px] text-foreground/80">
              Find community-made hacks and patch in-browser with your own legally-obtained base ROMs for Game Boy, Game Boy Color, Game Boy Advance, and Nintendo DS.
            </p>
            <div className="mt-12 sm:mt-8 mx-auto flex flex-col items-start max-w-[320px] sm:flex-row sm:items-center sm:max-w-none gap-3">
              <Link
                href="/discover"
                className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md bg-[var(--accent)] px-5 text-base font-semibold sm:font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-700)] elevate"
              >
                Explore hacks
              </Link>
              <Link
                href="/submit"
                className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md border border-white/10 bg-white/10 px-5 text-base font-semibold sm:font-medium text-foreground transition-colors hover:bg-white/15 elevate"
              >
                Submit a patch
              </Link>
              <Link
                href="/login"
                className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md sm:px-5 text-base font-medium text-foreground/90 hover:underline"
              >
                Already a creator? Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-2xl px-6 py-6 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Curated discovery</div>
            <p className="mt-1 text-sm text-foreground/70">Browse popular and trending patches across generations.</p>
          </div>
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Built-in patcher</div>
            <p className="mt-1 text-sm text-foreground/70">Provide your base ROMs and patch in the browser.</p>
          </div>
          <div className="card p-5">
            <div className="text-[15px] font-semibold tracking-tight">Submit your own</div>
            <p className="mt-1 text-sm text-foreground/70">Join as a creator and submit your own rom hacks.</p>
          </div>
        </div>
        <div className="my-6 mx-auto flex flex-col items-center max-w-[320px] sm:mt-10">
          <Link href="/faq" className="inline-flex items-center rounded-full elevate border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 px-4 py-1.5 text-sm text-foreground hover:bg-black/10 dark:hover:bg-white/10">
            <span className="font-medium">New to Hackdex?</span>
            <span className="ml-1 underline underline-offset-2">Read the FAQ</span>
            <FaArrowRightLong size={12} aria-hidden className="ml-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}

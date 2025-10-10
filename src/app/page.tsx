import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-screen-2xl px-6 py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="gradient-text">Discover</span> and share Pokémon ROM hack patches
            </h1>
            <p className="mt-4 text-[15px] text-foreground/80">
              Find community-made hacks and patch in-browser with your own legally-obtained base ROMs for Game Boy, GBC, GBA, and Nintendo DS.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/discover"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-base font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-700)] elevate"
              >
                Explore hacks
              </Link>
              <Link
                href="/submit"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/10 bg-white/10 px-5 text-base font-medium text-foreground transition-colors hover:bg-white/15 elevate"
              >
                Submit a patch
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md px-5 text-base font-medium text-foreground/90 hover:underline"
              >
                Already a creator? Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-2xl px-6 py-12">
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
      </section>
    </div>
  );
}

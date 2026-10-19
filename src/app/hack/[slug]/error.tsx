"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";

/** Shown when hack data fails to load (usually a Supabase outage), so it doesn't read as a missing hack. */
export default function HackErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8 h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px]">Couldn&apos;t load this hack</h1>
        <p className="text-lg text-text-3 text-center">Something went wrong loading the hack data. Try again in a moment.</p>
        <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={retry}
            className="inline-flex h-14 w-full sm:h-12 sm:w-auto cursor-pointer items-center justify-center rounded-control bg-accent-deep px-5 text-base font-semibold sm:font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent elevate"
          >
            Try again
          </button>
          <Link
            href="/discover"
            className="inline-flex h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-control px-5 text-base font-semibold sm:font-medium text-text-2 transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            View all hacks
          </Link>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import Link from "next/link";

export default async function NotFoundPage() {
  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8 h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">Not Found</h1>
        <p className="text-lg text-foreground/60 text-center">The hack you are looking for does not exist or has not yet been approved.</p>
        <Link
          href="/discover"
          className="inline-flex mt-4 h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-md bg-[var(--accent)] px-5 text-base font-semibold sm:font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-700)] elevate"
        >
          View all hacks
        </Link>
        <p className="mt-4 md:text-sm text-foreground/60 text-center">Is this your hack? <Link href="/login" className="text-[var(--accent)] hover:underline">Log in</Link> to make changes.</p>
      </div>
    </div>
  );
}

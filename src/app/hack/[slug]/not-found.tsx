import React from "react";
import Link from "next/link";

export default async function NotFoundPage() {
  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8 h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px]">Not Found</h1>
        <p className="text-lg text-text-3 text-center">The hack you are looking for does not exist or has not yet been approved.</p>
        <Link
          href="/discover"
          className="inline-flex mt-4 h-14 w-full sm:h-12 sm:w-auto items-center justify-center rounded-control bg-accent-deep px-5 text-base font-semibold sm:font-medium text-white transition-colors hover:bg-accent-hover elevate"
        >
          View all hacks
        </Link>
        <p className="mt-4 md:text-sm text-text-3 text-center">Is this your hack? <Link href="/login" className="text-accent-text hover:underline">Log in</Link> to make changes.</p>
      </div>
    </div>
  );
}

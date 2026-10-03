"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FiX } from "react-icons/fi";
import { PiConfettiBold } from "react-icons/pi";
import { FRESH_LOOK_STORAGE_KEY } from "@/utils/initScripts";

/** Player-facing pages. Home has the milestone card instead; editors, dashboards, and admin pages skip it. */
const PAGES = [/^\/discover$/, /^\/hack\/[^/]+$/, /^\/faq$/, /^\/roms$/];

/** The copy thanks players for this milestone, so the banner only runs while it's the one celebrated. */
const SHOWN = process.env.NEXT_PUBLIC_DOWNLOADS_MILESTONE?.trim() === "1000000";

/**
 * "Hackdex has a fresh new look" strip under the header, for visitors who land
 * somewhere other than the homepage. Dismissing hides it on this device until the
 * next event (see FRESH_LOOK_STORAGE_KEY); freshLookInitScript hides it before paint.
 */
export default function FreshLookBanner() {
  if (!SHOWN) return null;
  return (
    // The fallback is what the server renders (search params aren't known for static pages).
    <React.Suspense fallback={<Banner />}>
      <BannerOutsideEditor />
    </React.Suspense>
  );
}

function BannerOutsideEditor() {
  return useSearchParams().get("edit") === "1" ? null : <Banner />;
}

function Banner() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed || !PAGES.some((page) => page.test(pathname))) return null;

  function dismiss() {
    setDismissed(true);
    document.documentElement.setAttribute("data-fresh-look-dismissed", "");
    try {
      localStorage.setItem(FRESH_LOOK_STORAGE_KEY, "1");
    } catch {
      // Private browsing: it just comes back next visit.
    }
  }

  return (
    <div className="fresh-look-banner border-b border-[color-mix(in_srgb,var(--rose)_22%,var(--line))] bg-[color-mix(in_srgb,var(--rose)_8%,var(--surface))]">
      <div className="mx-auto flex max-w-[1164px] items-center gap-2.5 py-2 pl-6 pr-3 text-[13.5px] leading-[1.45] md:pr-4">
        <PiConfettiBold aria-hidden className="h-4 w-4 flex-none text-accent-text" />
        <p className="min-w-0 flex-1">
          <b className="font-bold text-text">Hackdex has a fresh new look.</b>{" "}
          <span className="text-text-2">A thank you for 1,000,000 downloads: faster browsing, clearer hack pages, and a better user experience.</span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-control text-text-3 transition-colors hover:bg-text/[.08] hover:text-text"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

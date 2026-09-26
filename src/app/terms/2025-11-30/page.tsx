import type { Metadata } from "next";
import Link from "next/link";
import Markdown from "@/components/Markdown/Markdown";
import termsMd from "@/../docs/legal/archive/TERMS-2025-11-30.md";

export const metadata: Metadata = {
  title: "Terms of Service, November 30, 2025",
  alternates: {
    canonical: "/terms/2025-11-30",
  },
  robots: { index: false, follow: true },
};

export default function ArchivedTermsPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-6 sm:py-12">
      <div className="prose prose-invert max-w-none">
        <p>
          This is a preserved copy of version 1.0.2, effective from November 30,
          2025 through October 2, 2026. <Link href="/terms">Version 1.1.0</Link>{" "}
          takes effect on October 3, 2026.
        </p>
        <Markdown>{termsMd}</Markdown>
      </div>
    </div>
  );
}

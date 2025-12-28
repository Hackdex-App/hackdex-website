import React from "react";
import type { Metadata } from "next";
import Markdown from "@/components/Markdown/Markdown";
import privacyMd from "@/../docs/legal/PRIVACY.md";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-6 sm:py-12">
      <div className="prose prose-invert max-w-none">
        <Markdown>{privacyMd}</Markdown>
      </div>
    </div>
  );
}

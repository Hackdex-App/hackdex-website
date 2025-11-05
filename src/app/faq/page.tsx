import React from "react";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import entriesMd from "./entries.md";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Hackdex, how it works, and what makes it unique.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-6 py-6 sm:py-12">
      <h1 className="text-3xl font-bold">FAQ for Hackdex</h1>
      <div className="mt-6 prose prose-invert max-w-none faq-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>{entriesMd}</ReactMarkdown>
      </div>
    </div>
  );
}

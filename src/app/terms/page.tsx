import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import termsMd from "@/../docs/legal/TERMS.md";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6 sm:py-12">
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>{termsMd as unknown as string}</ReactMarkdown>
      </div>
    </div>
  );
}



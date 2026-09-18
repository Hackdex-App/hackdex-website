"use client";

import React from "react";
import TagSelector from "@/components/Submit/TagSelector";
import type { CatalogTagRow } from "@/types/catalogTag";
import { FIELD, useAutosave, useDraftEditing } from "./DraftEditing";

interface DraftHeaderProps {
  title: string;
  summary: string;
  tags: string[];
  catalogTags: CatalogTagRow[];
  tagsUpdatedAt: string;
}

const SUMMARY_MAX = 100;
const TITLE_MAX = 64;

/** Title, summary and tags edited in place of the hack page header. Each field autosaves once typing pauses. */
export default function DraftHeader({ title: initialTitle, summary: initialSummary, tags: initialTags, catalogTags, tagsUpdatedAt }: DraftHeaderProps) {
  const { save } = useDraftEditing();
  const [title, setTitle] = React.useState(initialTitle);
  const [summary, setSummary] = React.useState(initialSummary);
  const [tags, setTags] = React.useState(initialTags);
  const [summaryFocused, setSummaryFocused] = React.useState(false);

  useAutosave(title, (v) => {
    if (v.trim()) void save({ title: v.trim() });
  });
  useAutosave(summary, (v) => void save({ summary: v.trim() }));
  useAutosave(tags, (v) => void save({ tags: v }), 500);

  const nearLimit = summary.length > SUMMARY_MAX - 10;

  return (
    <>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={TITLE_MAX}
        aria-label="Title"
        placeholder="Hack title"
        className="-mx-2 w-[calc(100%+16px)] rounded-control border border-transparent bg-transparent px-2 font-display text-[28px] leading-[1.1] text-text outline-none transition-colors hover:border-line focus:border-line-strong focus:bg-surface md:text-[clamp(32px,3.4vw,40px)]"
      />
      <label className="relative mt-3 block max-w-[70ch]">
        <span className="sr-only">Summary</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          onFocus={() => setSummaryFocused(true)}
          onBlur={() => setSummaryFocused(false)}
          rows={2}
          maxLength={SUMMARY_MAX + 20}
          placeholder="One or two sentences players see on the card."
          className={`${FIELD} resize-none py-2 pr-16 text-[14px] leading-[1.45] md:text-[15px] ${summary.length > SUMMARY_MAX ? "border-error" : ""}`}
        />
        {(summaryFocused || nearLimit) && (
          <span className={`pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums ${summary.length > SUMMARY_MAX ? "text-error" : "text-text-3"}`}>
            {summary.length}/{SUMMARY_MAX}
          </span>
        )}
      </label>
      <div className="mt-4">
        <TagSelector value={tags} onChange={setTags} catalogTags={catalogTags} newTagsCutoff={new Date(tagsUpdatedAt)} />
      </div>
    </>
  );
}

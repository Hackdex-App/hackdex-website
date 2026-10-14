"use client";

import React from "react";
import Markdown from "@/components/Markdown/Markdown";
import { FIELD, useAutosave, useDraftEditing } from "./DraftEditing";

/** Markdown description with a Write / Preview switch, in the About tab. Autosaves when typing pauses. */
export default function DraftAbout({ description: initial }: { description: string }) {
  const { save } = useDraftEditing();
  const [text, setText] = React.useState(initial);
  const [mode, setMode] = React.useState<"write" | "preview">("write");
  useAutosave(text, (v) => void save({ description: v.trim() }), 1000);

  return (
    <section>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lg font-semibold leading-tight">About</h2>
        <div role="group" aria-label="Mode" className="inline-flex rounded-control bg-surface-2 p-0.5 text-[13px] font-medium">
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-[7px] px-3 py-1 transition-colors ${mode === m ? "bg-surface text-text shadow-rest" : "text-text-2 hover:text-text"}`}
            >
              {m === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
      </div>
      {mode === "write" ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            aria-label="Description"
            placeholder="Say what the hack changes and what players should expect. Markdown works here."
            className={`${FIELD} min-h-[320px] resize-y py-3 font-mono text-[13px] leading-[1.55]`}
          />
          <p className="mt-2 text-xs text-text-3">Markdown. Headings, lists, links and ||spoilers|| all work.</p>
        </>
      ) : text.trim() ? (
        <div className="prose prose-sm max-w-[70ch] text-text-2">
          <Markdown headingLevelOffset={1}>{text}</Markdown>
        </div>
      ) : (
        <p className="text-sm italic text-text-3">Nothing written yet.</p>
      )}
    </section>
  );
}

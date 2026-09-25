"use client";

import React from "react";
import { FiEdit2, FiPlus } from "react-icons/fi";
import Modal from "@/components/Primitives/Modal";
import TagSelector from "@/components/Submit/TagSelector";
import type { CatalogTagRow } from "@/types/catalogTag";
import { useDraftEditing } from "./DraftEditing";

const SAVE_LABEL = { idle: null, saving: "Saving…", saved: "Saved", error: "Couldn't save" } as const;

/**
 * Tags as the published page shows them, plus a pill that opens the picker in
 * a modal, so the edit header keeps the published layout. Changes go through
 * the parent's autosave (live drafts show its status by Done); tags added in
 * the modal pop in once it closes.
 */
export default function DraftTags({ tags, onChange, catalogTags, tagsUpdatedAt }: { tags: string[]; onChange: (next: string[]) => void; catalogTags: CatalogTagRow[]; tagsUpdatedAt: string }) {
  const { status, live } = useDraftEditing();
  const [open, setOpen] = React.useState(false);
  const [fresh, setFresh] = React.useState<string[]>([]);
  const openedWith = React.useRef<string[]>([]);

  function openPicker() {
    openedWith.current = tags;
    setFresh([]);
    setOpen(true);
  }
  function closePicker() {
    setOpen(false);
    setFresh(tags.filter((t) => !openedWith.current.includes(t)));
  }

  const Icon = tags.length ? FiEdit2 : FiPlus;
  return (
    <div className="mt-3.5">
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
        {tags.map((t) => (
          <li key={t} className={`rounded-full bg-surface-2 px-2.5 py-1 text-[13px] leading-tight text-text-2 ${fresh.includes(t) ? "anim-tag-new" : ""}`}>
            {t}
          </li>
        ))}
        <li className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-[3px] text-[13px] font-medium leading-tight text-text-2 transition-colors hover:border-solid hover:border-text-3 hover:bg-surface hover:text-text"
          >
            <Icon className="h-3 w-3" /> {tags.length ? "Edit tags" : "Add tags"}
          </button>
          {tags.length === 0 && <span className="text-xs text-text-3">Players filter by these on Discover.</span>}
        </li>
      </ul>

      <Modal title="Tags" visible={open} onClose={closePicker} className="max-w-2xl">
        <TagSelector
          value={tags}
          onChange={onChange}
          catalogTags={catalogTags}
          newTagsCutoff={new Date(tagsUpdatedAt)}
          done={
            <>
              <span className="mr-auto text-xs text-text-3" aria-live="polite">
                {live && SAVE_LABEL[status]}
              </span>
              <button type="button" onClick={closePicker} className="inline-flex h-10 items-center rounded-control bg-accent-deep px-[18px] text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                Done
              </button>
            </>
          }
        />
      </Modal>
    </div>
  );
}

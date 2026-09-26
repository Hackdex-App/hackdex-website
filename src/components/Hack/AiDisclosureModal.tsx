"use client";

import React from "react";
import Link from "next/link";
import Modal from "@/components/Primitives/Modal";
import AiLabel, { AI_AREA_ICONS } from "@/components/Hack/AiLabel";
import { AI_AREAS, AI_HEADLINES, AI_LEVEL_LABEL, aiHeadline, type AiDisclosure, type AiLevel, type AiLevels } from "@/utils/aiDisclosure";

const NOTE_MAX = 1000;

/**
 * The creator's AI disclosure form with a live preview of the label. Every
 * area needs a pick before Save, so a new disclosure starts with none chosen.
 * `onSave` resolves true once the change is saved (or staged), closing the modal.
 */
export default function AiDisclosureModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: AiDisclosure | null;
  onClose: () => void;
  onSave: (levels: AiLevels, note: string | null) => Promise<boolean>;
}) {
  return (
    <Modal title="AI use" visible={visible} onClose={onClose} className="max-w-[860px]">
      <AiDisclosureForm initial={initial} onCancel={onClose} onSave={onSave} />
    </Modal>
  );
}

function AiDisclosureForm({ initial, onCancel, onSave }: { initial: AiDisclosure | null; onCancel: () => void; onSave: (levels: AiLevels, note: string | null) => Promise<boolean> }) {
  const [levels, setLevels] = React.useState<Partial<AiLevels>>(initial?.levels ?? {});
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [busy, setBusy] = React.useState(false);
  const complete = AI_AREAS.every((a) => levels[a.key] !== undefined);
  const preview: AiLevels = Object.fromEntries(AI_AREAS.map((a) => [a.key, levels[a.key] ?? "none"])) as AiLevels;
  const headline = aiHeadline(preview);

  async function save() {
    if (!complete || busy) return;
    setBusy(true);
    const ok = await onSave(preview, note.trim() || null);
    setBusy(false);
    if (ok) onCancel();
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
      <div>
        <p className="-mt-2 text-[13px] leading-[1.45] text-text-2">
          Rough is fine. Count AI-generated content or code that you or your team added to the hack or this page, even if you edited it afterward. Brainstorming, experiments you didn&rsquo;t use, and anything that came with a base you built on don&rsquo;t count.{" "}
          <Link href="/faq#ai-disclosure" prefetch={false} target="_blank" className="text-link-hd">
            What the levels mean
          </Link>
        </p>

        {AI_AREAS.map((area, i) => {
          const Icon = AI_AREA_ICONS[area.key];
          const picked = levels[area.key];
          const hints: Partial<Record<AiLevel, string>> = area.hints;
          const hint = picked && hints[picked];
          return (
            <React.Fragment key={area.key}>
              {(i === 0 || area.key === "code") && (
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[.04em] text-text-3">{i === 0 ? "What players see and hear" : "Under the hood"}</p>
              )}
              <fieldset className={`py-2.5 ${i === 0 || area.key === "code" ? "" : "border-t border-line"}`}>
                <legend className="sr-only">{area.name}</legend>
                <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span aria-hidden className="inline-flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-text-3" /> {area.name}
                  </span>
                  <div className="inline-flex flex-wrap rounded-control bg-surface-2 p-0.5">
                    {area.levels.map((level) => (
                      <label
                        key={level}
                        className="cursor-pointer rounded-md px-2.5 py-1 text-[12.5px] text-text-2 transition-colors hover:text-text has-[:checked]:bg-surface has-[:checked]:font-semibold has-[:checked]:text-text has-[:checked]:shadow-rest has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                      >
                        <input
                          type="radio"
                          name={`ai-${area.key}`}
                          value={level}
                          checked={picked === level}
                          onChange={() => setLevels((prev) => ({ ...prev, [area.key]: level }))}
                          className="sr-only"
                        />
                        {AI_LEVEL_LABEL[level]}
                      </label>
                    ))}
                  </div>
                </div>
                {hint && <p className="mt-1.5 text-[12.5px] text-text-2">{hint}</p>}
              </fieldset>
            </React.Fragment>
          );
        })}

        <label className="mt-1 block border-t border-line pt-3">
          <span className="block text-sm font-semibold">
            Anything you want to explain? <span className="font-normal text-text-3">Optional</span>
          </span>
          <span className="mb-2 mt-0.5 block text-[12.5px] text-text-3">Shown to players under the breakdown. Tell them what AI was used for, how, or why.</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="e.g. The title screen started as an AI image that I traced and recolored."
            className="w-full resize-y rounded-control border border-line-strong bg-surface px-2.5 py-2 text-[13.5px] leading-[1.45] text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--rose-soft)]"
          />
        </label>
      </div>

      <div className="md:sticky md:top-0">
        <p className="mb-2 text-[11.5px] font-semibold text-text-3">Players will see</p>
        <AiLabel disclosure={{ levels: preview, note: note.trim() || null, disclosedAt: new Date().toISOString() }} defaultOpen />
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-text-3">
          Shows under
          <FilterChip on>Any</FilterChip>
          <FilterChip on={headline !== AI_HEADLINES.content}>No AI content</FilterChip>
          <FilterChip on={headline === AI_HEADLINES.none}>No direct AI usage</FilterChip>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-4 md:col-span-2">
        <span className="mr-auto text-xs text-text-3" aria-live="polite">
          {!complete && "Pick a level for every area to save."}
        </span>
        <button type="button" onClick={onCancel} className="inline-flex h-10 items-center rounded-control px-4 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!complete || busy}
          className="inline-flex h-10 items-center rounded-control bg-accent-deep px-[18px] text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function FilterChip({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full border px-2 text-[11.5px] font-semibold leading-5 transition-colors duration-[160ms] ${on ? "border-transparent bg-surface-2 text-text" : "border-line-strong text-text-3 line-through"}`}
    >
      {children}
    </span>
  );
}

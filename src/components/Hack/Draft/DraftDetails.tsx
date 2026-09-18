"use client";

import React from "react";
import { FiEdit2, FiLock } from "react-icons/fi";
import Sheet from "@/components/Sheet";
import Select from "@/components/Primitives/Select";
import { baseRoms, PLATFORM_NAMES } from "@/data/baseRoms";
import type { Database } from "@/types/db";
import { FIELD, useDraftEditing } from "./DraftEditing";

type Completion = Database["public"]["Enums"]["Completion Status"];
type Social = { discord?: string; twitter?: string; pokecommunity?: string; github?: string };

export interface DraftDetailsValues {
  base_rom: string;
  language: string;
  completion_status: Completion | null;
  box_art: string | null;
  social_links: Social | null;
}

interface DraftDetailsProps {
  values: DraftDetailsValues;
  /** A verified patch pins the base ROM; the field shows locked. */
  baseLocked: boolean;
}

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Japanese", "Chinese", "Korean", "Other"];
const COMPLETION: Completion[] = ["Complete", "Demo", "Alpha", "Beta"];
const SOCIAL: { key: keyof Social; label: string; placeholder: string }[] = [
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/…" },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/…" },
  { key: "pokecommunity", label: "PokéCommunity", placeholder: "https://www.pokecommunity.com/threads/…" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/…" },
];

const urlLike = (s: string) => !s || /^https?:\/\//i.test(s);

/** "Edit details" button for the rail, opening a sheet with the fields that are not edited in place. Saves on Done. */
export default function DraftDetails({ values, baseLocked }: DraftDetailsProps) {
  const { save } = useDraftEditing();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [base, setBase] = React.useState(values.base_rom);
  const [language, setLanguage] = React.useState(values.language);
  const [completion, setCompletion] = React.useState<Completion | "">(values.completion_status ?? "");
  const [boxArt, setBoxArt] = React.useState(values.box_art ?? "");
  const [social, setSocial] = React.useState<Record<keyof Social, string>>({
    discord: values.social_links?.discord ?? "",
    twitter: values.social_links?.twitter ?? "",
    pokecommunity: values.social_links?.pokecommunity ?? "",
    github: values.social_links?.github ?? "",
  });

  const invalid = !urlLike(boxArt) || SOCIAL.some((s) => !urlLike(social[s.key]));

  async function done() {
    const links = Object.fromEntries(Object.entries(social).filter(([, v]) => v.trim())) as Social;
    setSaving(true);
    const ok = await save({
      ...(baseLocked ? {} : { base_rom: base }),
      language,
      ...(completion ? { completion_status: completion } : {}),
      box_art: boxArt.trim() || null,
      social_links: Object.keys(links).length ? links : null,
    });
    setSaving(false);
    if (ok) setOpen(false);
  }

  const baseRom = baseRoms.find((r) => r.id === base);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-surface text-sm font-medium text-text transition-colors hover:border-text-3"
      >
        <FiEdit2 className="h-4 w-4 text-text-3" /> Edit details
      </button>
      {open && (
        <Sheet
          title="Details"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 items-center rounded-control px-3 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || invalid}
                onClick={done}
                className="inline-flex h-10 items-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <Field label="Base ROM">
              {baseLocked ? (
                <div className="flex items-start gap-2 rounded-control bg-surface-2 px-3 py-2.5 text-sm">
                  <FiLock className="mt-0.5 h-4 w-4 flex-none text-text-3" />
                  <div>
                    <span className="plat-dot font-medium" data-platform={baseRom?.platform}>
                      {baseRom?.name ?? base}
                    </span>
                    <p className="mt-0.5 text-xs text-text-3">Locked. Your patch was verified against this ROM.</p>
                  </div>
                </div>
              ) : (
                <Select value={base} onChange={setBase} options={baseRoms.map((r) => ({ value: r.id, label: r.name, description: PLATFORM_NAMES[r.platform] }))} />
              )}
            </Field>
            <Field label="Language">
              <Select value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
            </Field>
            <Field label="Completion status">
              <Select value={completion} onChange={(v) => setCompletion(v as Completion)} placeholder="Choose one" options={COMPLETION.map((c) => ({ value: c, label: c }))} />
            </Field>
            <Field label="Box art URL" hint="Optional. Shown in the rail with a download link.">
              <input value={boxArt} onChange={(e) => setBoxArt(e.target.value)} placeholder="https://…" className={`${FIELD} h-10 ${urlLike(boxArt) ? "" : "border-error"}`} />
            </Field>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">Links</legend>
              {SOCIAL.map((s) => (
                <Field key={s.key} label={s.label} small>
                  <input
                    value={social[s.key]}
                    onChange={(e) => setSocial((prev) => ({ ...prev, [s.key]: e.target.value }))}
                    placeholder={s.placeholder}
                    className={`${FIELD} h-10 ${urlLike(social[s.key]) ? "" : "border-error"}`}
                  />
                </Field>
              ))}
            </fieldset>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Field({ label, hint, small = false, children }: { label: string; hint?: string; small?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={small ? "text-xs font-medium text-text-2" : "text-sm font-medium"}>{label}</span>
      {children}
      {hint && <span className="text-xs text-text-3">{hint}</span>}
    </label>
  );
}

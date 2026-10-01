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
  /** Set on hacks uploaded on someone else's behalf; shows the creator fields. */
  original_author: string | null;
  permission_from: string | null;
  /** Left out once the hack is listed, since admins only read it during review. */
  verification_contact_info?: string | null;
}

interface DraftDetailsProps {
  values: DraftDetailsValues;
  /** A verified patch pins the base ROM; the field shows locked. */
  baseLocked: boolean;
  /** The rail. Its groups open the sheet through EditDetailsLink. */
  children: React.ReactNode;
}

const OpenCtx = React.createContext<(() => void) | null>(null);

/** "Edit" link for a rail group heading; opens the details sheet on the fields that group shows. */
export function EditDetailsLink() {
  const open = React.useContext(OpenCtx);
  if (!open) return null;
  return (
    <button type="button" onClick={open} className="inline-flex items-center gap-1 text-[12px] font-medium text-link hover:underline hover:underline-offset-[3px]">
      <FiEdit2 className="h-3 w-3" /> Edit
    </button>
  );
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

type Form = {
  base: string;
  language: string;
  completion: Completion | "";
  boxArt: string;
  social: Record<keyof Social, string>;
  creator: string;
  permission: string;
  contact: string;
};

function toForm(values: DraftDetailsValues): Form {
  return {
    base: values.base_rom,
    language: values.language,
    completion: values.completion_status ?? "",
    boxArt: values.box_art ?? "",
    social: {
      discord: values.social_links?.discord ?? "",
      twitter: values.social_links?.twitter ?? "",
      pokecommunity: values.social_links?.pokecommunity ?? "",
      github: values.social_links?.github ?? "",
    },
    creator: values.original_author ?? "",
    permission: values.permission_from ?? "",
    contact: values.verification_contact_info ?? "",
  };
}

/** Wraps the rail and owns the details sheet for the fields that are not edited in place: base ROM, language, completion, box art, links, and the creator and review fields. Saves (or stages, on listed hacks) on the footer button. */
export default function DraftDetails({ values, baseLocked, children }: DraftDetailsProps) {
  const [open, setOpen] = React.useState(false);
  // What the sheet opens with: the last saved or applied values, so Cancel drops only this session's edits.
  const [applied, setApplied] = React.useState(() => toForm(values));
  const openSheet = React.useCallback(() => setOpen(true), []);

  return (
    <OpenCtx.Provider value={openSheet}>
      {children}
      {open && (
        <DetailsSheet
          initial={applied}
          baseLocked={baseLocked}
          behalf={values.original_author !== null}
          askContact={values.verification_contact_info !== undefined}
          onApplied={(form) => {
            setApplied(form);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </OpenCtx.Provider>
  );
}

interface DetailsSheetProps {
  initial: Form;
  baseLocked: boolean;
  behalf: boolean;
  askContact: boolean;
  onApplied: (form: Form) => void;
  onClose: () => void;
}

/** One editing session; mounts with the sheet, so closing it any way but Save/Apply discards its edits. */
function DetailsSheet({ initial, baseLocked, behalf, askContact, onApplied, onClose }: DetailsSheetProps) {
  const { save, live } = useDraftEditing();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(initial);
  const { base, language, completion, boxArt, social, creator, permission, contact } = form;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const invalid = !urlLike(boxArt) || SOCIAL.some((s) => !urlLike(social[s.key])) || (behalf && (!creator.trim() || !permission.trim()));

  async function done() {
    const links = Object.fromEntries(Object.entries(social).filter(([, v]) => v.trim())) as Social;
    setSaving(true);
    const ok = await save({
      ...(baseLocked ? {} : { base_rom: base }),
      language,
      ...(completion ? { completion_status: completion } : {}),
      box_art: boxArt.trim() || null,
      social_links: Object.keys(links).length ? links : null,
      ...(behalf ? { original_author: creator, permission_from: permission } : {}),
      ...(askContact ? { verification_contact_info: contact } : {}),
    });
    setSaving(false);
    if (ok) onApplied(form);
  }

  const baseRom = baseRoms.find((r) => r.id === base);

  return (
    <Sheet
      title="Details"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-control px-3 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || invalid}
            onClick={done}
            className="inline-flex h-10 items-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : live ? "Save" : "Apply"}
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
            <Select value={base} onChange={(v) => set("base", v)} options={baseRoms.map((r) => ({ value: r.id, label: r.name, description: PLATFORM_NAMES[r.platform] }))} />
          )}
        </Field>
        <Field label="Language">
          <Select value={language} onChange={(v) => set("language", v)} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
        </Field>
        <Field label="Completion status">
          <Select value={completion} onChange={(v) => set("completion", v as Completion)} placeholder="Choose one" options={COMPLETION.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Box art URL" hint="Optional. Shown in the rail with a download link.">
          <input value={boxArt} onChange={(e) => set("boxArt", e.target.value)} placeholder="https://…" className={`${FIELD} h-10 ${urlLike(boxArt) ? "" : "border-error"}`} />
        </Field>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Links</legend>
          {SOCIAL.map((s) => (
            <Field key={s.key} label={s.label} small>
              <input
                value={social[s.key]}
                onChange={(e) => set("social", { ...social, [s.key]: e.target.value })}
                placeholder={s.placeholder}
                className={`${FIELD} h-10 ${urlLike(social[s.key]) ? "" : "border-error"}`}
              />
            </Field>
          ))}
        </fieldset>
        {behalf && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Creator</legend>
            <Field label="Creator’s name" small>
              <input value={creator} onChange={(e) => set("creator", e.target.value)} className={`${FIELD} h-10 ${creator.trim() ? "" : "border-error"}`} />
            </Field>
            <Field label="Where they gave permission" small>
              <input
                value={permission}
                onChange={(e) => set("permission", e.target.value)}
                placeholder="Discord DM, PokéCommunity thread, email…"
                className={`${FIELD} h-10 ${permission.trim() ? "" : "border-error"}`}
              />
            </Field>
          </fieldset>
        )}
        {askContact && (
          <Field label="Verification contact" hint="Optional, but speeds up verification. Only admins see it, while they review the hack. Name where your post history shows you made it, like one of your socials and the communities you’re active in, or link a public post where you mention submitting to Hackdex.">
            <textarea value={contact} onChange={(e) => set("contact", e.target.value)} rows={4} placeholder={"@yourname, active in RH Hideout\nor a link to your post about it"} className={`${FIELD} resize-y py-2`} />
          </Field>
        )}
      </div>
    </Sheet>
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

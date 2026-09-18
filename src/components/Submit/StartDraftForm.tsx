"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createDraft } from "@/app/submit/actions";
import { baseRoms, PLATFORM_NAMES, type Platform } from "@/data/baseRoms";
import Select, { type SelectDivider, type SelectOption } from "@/components/Primitives/Select";
import { slugify } from "@/utils/format";

const PLATFORM_ORDER: Platform[] = ["GBA", "GBC", "GB", "NDS"];

/** Base ROMs grouped by platform for the picker. */
const ROM_OPTIONS: (SelectOption | SelectDivider)[] = PLATFORM_ORDER.flatMap((platform) => {
  const roms = baseRoms.filter((r) => r.platform === platform);
  if (roms.length === 0) return [];
  return [{ type: "divider" as const, label: PLATFORM_NAMES[platform] }, ...roms.map((r) => ({ value: r.id, label: r.name }))];
});

const field = "h-[42px] w-full rounded-control border border-line-strong bg-surface px-3 text-[15px] text-text outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--rose-soft)]";
const label = "text-[13px] font-semibold text-text-2";
const hint = "text-xs text-text-3";

/**
 * Three things to begin. Creates a private draft and sends the creator to
 * its edit page; nothing is public until a reviewer has looked at it.
 */
export default function StartDraftForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [baseRom, setBaseRom] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [who, setWho] = React.useState<"mine" | "behalf">("mine");
  const [originalAuthor, setOriginalAuthor] = React.useState("");
  const [permissionFrom, setPermissionFrom] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const slug = slugify(title);
  const missing = [
    !title.trim() && "a title",
    !baseRom && "a base ROM",
    summary.trim().length < 10 && "a summary",
    who === "behalf" && (!originalAuthor.trim() || !permissionFrom.trim()) && "the creator's permission",
  ].filter((m): m is string => Boolean(m));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missing.length > 0 || busy || disabled) return;
    setBusy(true);
    setError(null);
    const res = await createDraft(new FormData(e.currentTarget));
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.push(`/hack/${res.slug}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-[560px] flex-col gap-5 rounded-card border border-line bg-surface p-6 shadow-rest md:p-7">
      <div>
        <h1 className="font-display text-[28px]">Start a hack page</h1>
        <p className="mt-1.5 text-sm text-text-2">Three things to begin. You get a private draft page right away; nothing is public until a volunteer has reviewed it.</p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Title</span>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pokémon Fire of Sky" maxLength={64} autoFocus className={field} disabled={disabled} />
        <span className={hint}>
          {slug ? (
            <>
              hackdex.net/hack/<b className="font-medium text-text-2">{slug}</b>
            </>
          ) : (
            "The page address comes from the title."
          )}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className={label}>Base ROM</span>
        <input type="hidden" name="base_rom" value={baseRom} />
        <Select
          value={baseRom}
          onChange={setBaseRom}
          options={ROM_OPTIONS}
          placeholder="Choose the game your patch applies to"
          enableFilter
          disabled={disabled}
          className="!h-[42px] !rounded-control !border !border-line-strong !bg-surface !text-[15px] !ring-0 focus:!border-accent focus:!ring-0"
        />
        <span className={hint}>Players bring this ROM; your patch is applied to it in their browser.</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>One-line summary</span>
        <textarea
          name="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          maxLength={100}
          placeholder="A new region, a new story, and a difficulty curve that respects your time."
          className={`${field} h-auto resize-none py-2.5 leading-normal`}
          disabled={disabled}
        />
        <span className={hint}>
          Shown in search results under the title. Plain text, no formatting. <span className={summary.length > 90 ? "text-warn" : ""}>{summary.length}/100</span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className={`${label} mb-1.5`}>I am submitting</legend>
        {(
          [
            ["mine", "My own hack"],
            ["behalf", "Someone else's hack, with their permission"],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex min-h-[30px] cursor-pointer items-center gap-2.5 text-sm">
            <input type="radio" name="who" value={value} checked={who === value} onChange={() => setWho(value)} className="h-4 w-4 accent-[var(--rose-deep)]" disabled={disabled} />
            {text}
          </label>
        ))}
        {who === "behalf" && (
          <div className="ml-7 mt-2 flex flex-col gap-3">
            <p className={hint}>Hackdex only lists hacks the creator has agreed to. Name them and say where they gave permission.</p>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Creator&rsquo;s name</span>
              <input name="original_author" value={originalAuthor} onChange={(e) => setOriginalAuthor(e.target.value)} placeholder="Skeli" className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Where they gave permission</span>
              <input name="permission_from" value={permissionFrom} onChange={(e) => setPermissionFrom(e.target.value)} placeholder="Discord DM, PokéCommunity thread, email…" className={field} />
            </label>
          </div>
        )}
      </fieldset>

      {error && <p className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

      <div className="mt-1 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={missing.length > 0 || busy || disabled}
          title={missing.length ? `Add ${missing.join(", ")}` : undefined}
          className="inline-flex h-11 items-center justify-center rounded-control bg-accent-deep px-5 text-[15px] font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create private draft"}
        </button>
        {missing.length > 0 && <span className="text-[13px] text-text-3">Add {missing.join(", ")} to continue.</span>}
      </div>
    </form>
  );
}

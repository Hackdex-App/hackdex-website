"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiAlertCircle, FiEdit2 } from "react-icons/fi";
import { checkSlugAvailable, createDraft } from "@/app/submit/actions";
import { baseRoms, PLATFORM_NAMES, type Platform } from "@/data/baseRoms";
import Select, { type SelectDivider, type SelectOption } from "@/components/Primitives/Select";
import { slugify } from "@/utils/format";
import { NETWORK_ERROR } from "@/utils/networkError";

const PLATFORM_ORDER: Platform[] = ["GBA", "GBC", "GB", "NDS"];

/** Base ROMs grouped by platform for the picker. */
const ROM_OPTIONS: (SelectOption | SelectDivider)[] = PLATFORM_ORDER.flatMap((platform) => {
  const roms = baseRoms.filter((r) => r.platform === platform);
  if (roms.length === 0) return [];
  return [{ type: "divider" as const, label: PLATFORM_NAMES[platform] }, ...roms.map((r) => ({ value: r.id, label: r.name }))];
});

const field = "h-[42px] w-full rounded-control border border-line-strong bg-surface px-3 text-[15px] text-text outline-none transition-[border-color,box-shadow] duration-[120ms] placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--rose-soft)]";
const label = "text-[13px] font-semibold text-text-2";

/** Slug cleanup while typing: like slugify, but keeps a trailing dash so "fire-" can become "fire-of". */
function typingSlug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 64);
}
const hint = "text-xs text-text-3";

/**
 * Three things to begin. Creates a private draft and sends the creator to
 * its edit page; nothing is public until a reviewer has looked at it.
 */
export default function StartDraftForm({ disabled = false, canSubmitForOthers = false }: { disabled?: boolean; canSubmitForOthers?: boolean }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [baseRom, setBaseRom] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [who, setWho] = React.useState<"mine" | "behalf">("mine");
  const [originalAuthor, setOriginalAuthor] = React.useState("");
  const [permissionFrom, setPermissionFrom] = React.useState("");
  const [madeIt, setMadeIt] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // null follows the title; a string is the creator's own address.
  const [customSlug, setCustomSlug] = React.useState<string | null>(null);
  const slug = customSlug === null ? slugify(title) : customSlug.replace(/-+$/, "");
  const availability = useSlugAvailability(slug);
  const missing = [
    !title.trim() && "a title",
    title.trim() && !slug && "a page address",
    availability === "taken" && "a different page address",
    !baseRom && "a base ROM",
    summary.trim().length < 10 && "a summary",
    who === "behalf" && (!originalAuthor.trim() || !permissionFrom.trim()) && "the creator's permission",
    !canSubmitForOthers && !madeIt && "your confirmation",
  ].filter((m): m is string => Boolean(m));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missing.length > 0 || availability === "checking" || busy || disabled) return;
    setBusy(true);
    setError(null);
    // Server actions throw on network failures; catch them so the button doesn't stay on "Creating…".
    const res = await createDraft(new FormData(e.currentTarget)).catch(() => ({ ok: false as const, error: NETWORK_ERROR }));
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

      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Title</span>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pokémon Fire of Sky" maxLength={64} autoFocus className={field} disabled={disabled} />
        </label>
        <input type="hidden" name="slug" value={slug} />
        {customSlug === null ? (
          <span className={`${hint} flex min-h-[26px] flex-wrap items-center gap-x-1.5`}>
            {slug ? (
              <>
                <span className="min-w-0 break-all">
                  hackdex.app/hack/<b className="font-medium text-text-2">{slug}</b>
                </span>
                <button
                  type="button"
                  aria-label="Edit page address"
                  title="Edit page address"
                  onClick={() => setCustomSlug(slug)}
                  disabled={disabled}
                  className="tap-target inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
                >
                  <FiEdit2 className="h-[13px] w-[13px]" />
                </button>
                <SlugStatus availability={availability} />
              </>
            ) : title.trim() ? (
              // A title with no ASCII letters or digits (e.g. "ポケモン") slugifies to nothing.
              <>
                This title doesn&rsquo;t make a page address.
                <button type="button" onClick={() => setCustomSlug("")} disabled={disabled} className="text-link-hd">
                  Choose one
                </button>
              </>
            ) : (
              "The page address comes from the title."
            )}
          </span>
        ) : (
          <SlugField
            value={customSlug}
            onChange={setCustomSlug}
            onMatchTitle={() => setCustomSlug(null)}
            availability={availability}
            empty={!slug}
            disabled={disabled}
          />
        )}
      </div>

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

      {/* Only archivers (admins included) may list someone else's hack; everyone else confirms it's theirs. */}
      {canSubmitForOthers ? (
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
      ) : (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-strong px-3.5 py-3 text-sm transition-colors has-[:checked]:border-accent-deep has-[:checked]:bg-accent-soft">
          <input type="checkbox" checked={madeIt} onChange={(e) => setMadeIt(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--rose-deep)]" disabled={disabled} />
          <span>
            I made this hack, or I&rsquo;m part of the team that did
            <span className={`${hint} mt-0.5 block`}>
              Hackdex doesn&rsquo;t accept reuploads of other people&rsquo;s hacks, and every hack must comply with the{" "}
              <Link href="/terms" prefetch={false} className="text-link-hd">Terms of Service</Link>. Submissions that don&rsquo;t are rejected and may get your account banned.
            </span>
          </span>
        </label>
      )}

      {error && <p className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

      <div className="mt-1 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={missing.length > 0 || availability === "checking" || busy || disabled}
          title={missing.length ? `Add ${missing.join(", ")}` : undefined}
          className="inline-flex h-11 items-center justify-center rounded-control bg-accent-deep px-5 text-[15px] font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create private draft"}
        </button>
        <span className="text-xs text-text-3">
          By continuing, you agree to the <Link href="/terms" prefetch={false} className="text-link-hd">Terms of Service</Link>.
        </span>
      </div>
      {missing.length > 0 && <p className="-mt-3 text-[13px] text-text-3">Add {missing.join(", ")} to continue.</p>}
    </form>
  );
}

type Availability = "idle" | "checking" | "available" | "taken";

/** Debounced check that nobody else owns the slug yet. The server checks again on create. */
function useSlugAvailability(slug: string): Availability {
  const [result, setResult] = React.useState<{ slug: string; free: boolean } | null>(null);
  React.useEffect(() => {
    if (!slug) return;
    let stale = false;
    const t = setTimeout(async () => {
      const free = await checkSlugAvailable(slug).catch(() => true);
      if (!stale) setResult({ slug, free });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [slug]);
  if (!slug) return "idle";
  if (result?.slug !== slug) return "checking";
  return result.free ? "available" : "taken";
}

/** Only speaks up when there's something to act on; the auto address stays quiet while it's free. */
function SlugStatus({ availability, showAvailable = false }: { availability: Availability; showAvailable?: boolean }) {
  if (availability === "taken")
    return (
      <span className="inline-flex items-center gap-1 text-error">
        <FiAlertCircle className="h-3 w-3" /> {showAvailable ? "Another hack already uses this address." : "Already taken"}
      </span>
    );
  if (!showAvailable) return null;
  if (availability === "checking")
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-line-strong border-t-text-3" /> Checking…
      </span>
    );
  if (availability === "available")
    return (
      <span className="inline-flex items-center gap-1 text-ready">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" className="anim-draw" />
        </svg>
        Available
      </span>
    );
  return null;
}

/** The pencil's "Page address" field: prefix addon, cleanup as you type (so no rules to read), and a way back to following the title. */
function SlugField({
  value,
  onChange,
  onMatchTitle,
  availability,
  empty,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onMatchTitle: () => void;
  availability: Availability;
  empty: boolean;
  disabled: boolean;
}) {
  const bad = availability === "taken" || empty;
  const id = React.useId();
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        Page address
      </label>
      <span
        className={`flex h-[42px] overflow-hidden rounded-control border bg-surface transition-[border-color,box-shadow] duration-[120ms] ${
          bad
            ? "border-error shadow-[0_0_0_3px_rgba(185,28,28,.14)]"
            : "border-line-strong focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--rose-soft)]"
        }`}
      >
        <span className="flex flex-none items-center border-r border-line bg-surface-2 px-2.5 text-[13px] text-text-3">
          <span className="hidden sm:inline">hackdex.app</span>/hack/
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(typingSlug(e.target.value))}
          onBlur={() => onChange(value.replace(/-+$/, ""))}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          aria-invalid={bad}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-2.5 text-[15px] text-text outline-none!"
        />
      </span>
      <span className={`${hint} flex items-center justify-between gap-3`}>
        {empty ? <span className="text-error">Add a page address.</span> : <SlugStatus availability={availability} showAvailable />}
        <button type="button" onClick={onMatchTitle} className="text-link-hd flex-none cursor-pointer">
          Match title
        </button>
      </span>
    </div>
  );
}

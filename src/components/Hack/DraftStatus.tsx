"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiAlertCircle, FiCheck, FiEdit3, FiEye } from "react-icons/fi";
import { submitForReview } from "@/app/submit/actions";
import { useDraftEditingOptional } from "@/components/Hack/Draft/DraftEditing";
import { EditDetailsLink } from "@/components/Hack/Draft/DraftDetails";
import Modal from "@/components/Primitives/Modal";
import { NETWORK_ERROR } from "@/utils/networkError";

export type DraftStage = "draft" | "review" | "listed";

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  /** Sub-route of the hack that fixes it, e.g. "versions". */
  href?: string;
}

interface DraftStatusProps {
  slug: string;
  stage: DraftStage;
  submittedAt: string | null;
  required: ChecklistItem[];
  recommended: ChecklistItem[];
  /** Set while the creator is previewing the draft as a player; swaps the preview link for Back to editing. */
  preview?: boolean;
  /** Verification contact the reviewers see; the submit modal and the review card show it. */
  contact: string | null;
  /** An admin in someone else's draft: only the creator can submit it. */
  notOwner?: boolean;
}

const COPY: Record<DraftStage, { pill: string; tone: string }> = {
  draft: { pill: "Draft", tone: "bg-surface-2 text-text" },
  review: { pill: "In review", tone: "bg-accent-soft text-accent-text" },
  listed: { pill: "Listed", tone: "bg-ready-soft text-text" },
};

/** Strip at the top of a draft: where the hack stands, autosave state, preview, and Submit for review when the checklist is clear. */
export function DraftStatusStrip({ slug, stage, submittedAt, required, contact, preview = false, notOwner = false }: Omit<DraftStatusProps, "recommended">) {
  const editing = useDraftEditingOptional();
  const [confirming, setConfirming] = React.useState(false);
  const manual = editing !== null && !editing.live;
  const left = required.filter((r) => !r.done).length;
  const canSubmit = left === 0;
  const c = COPY[stage];

  const text =
    stage === "draft" && notOwner ? (
      <>Not submitted yet. Only the creator can submit it for review.</>
    ) : stage === "draft" ? (
      <>Only you can see this page. {canSubmit ? "Everything required is in place." : `${left} required ${left === 1 ? "item" : "items"} left before you can submit.`}</>
    ) : stage === "review" ? (
      <>Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : ""}.</>
    ) : (
      <>{editing?.dirty ? "Unsaved changes. Nothing publishes until you save." : "Live. Changes publish when you save; new versions go through a quick check."}</>
    );

  return (
    <div className="-mx-6 border-b border-line bg-surface px-6 md:mx-0 md:rounded-card md:border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm md:px-1">
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-1 text-[13px] font-semibold ${c.tone}`}>
          {stage === "listed" && <span className="ready-dot" />}
          {c.pill}
        </span>
        <p className="min-w-0 basis-full text-text-2 md:basis-auto md:flex-1">{preview ? "Previewing as a player. This is what the page looks like once listed." : text}</p>
        {editing && !manual && editing.status !== "idle" && (
          <span className={`inline-flex items-center gap-1 text-xs ${editing.status === "error" ? "text-error" : "text-text-3"}`} aria-live="polite">
            {editing.status === "saved" && <FiCheck className="h-3.5 w-3.5 text-ready" />}
            {editing.status === "saving" ? "Saving…" : editing.status === "saved" ? "Saved" : "Couldn't save"}
            {editing.status === "error" && editing.failed && (
              <button type="button" onClick={editing.retry} className="ml-1 font-semibold text-link hover:underline hover:underline-offset-[3px]">
                Retry
              </button>
            )}
          </span>
        )}
        <div className="flex flex-none items-center gap-2 max-md:ml-auto">
          {stage === "listed" ? (
            <>
              {/* DraftEditingProvider's leave guard confirms the discard. */}
              <Link
                href={`/hack/${slug}`}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line"
              >
                {editing?.dirty ? "Discard" : "Done editing"}
              </Link>
              {manual && (
                <button
                  type="button"
                  disabled={!editing.dirty || editing.status === "saving"}
                  onClick={() => void editing.saveAll()}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editing.status === "saving" ? "Saving…" : <><FiCheck className="h-4 w-4" /> Save changes</>}
                </button>
              )}
            </>
          ) : preview ? (
            <Link href={`/hack/${slug}`} className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line">
              <FiEdit3 className="h-4 w-4" /> Back to editing
            </Link>
          ) : (
            <Link href={`/hack/${slug}?preview=1`} className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line">
              <FiEye className="h-4 w-4" /> Preview as a player
            </Link>
          )}
          {stage === "draft" && !notOwner && (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => setConfirming(true)}
              className="inline-flex h-[38px] items-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit for review
            </button>
          )}
        </div>
      </div>
      {confirming && <SubmitModal slug={slug} contact={contact} onClose={() => setConfirming(false)} />}
    </div>
  );
}

const PRIMARY = "inline-flex h-10 items-center justify-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";
const QUIET = "inline-flex h-10 items-center justify-center rounded-control px-3 text-sm font-medium text-text-2 transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-60";
const CONTACT_HINT = "Add where your post history shows you made this hack, like one of your socials and the communities you’re active in. Or share a public link to where you mention you’re submitting to Hackdex. Only admins see it.";

/**
 * Confirms a submission and checks the verification contact on the way:
 * shows it for a last look if set, or asks for one (skippable) if not. Turns
 * into a what-happens-next screen once the hack is in the queue.
 */
function SubmitModal({ slug, contact, onClose }: { slug: string; contact: string | null; onClose: () => void }) {
  const router = useRouter();
  const saved = contact?.trim() ?? "";
  const [text, setText] = React.useState(saved);
  const [editingContact, setEditingContact] = React.useState(!saved);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function submit(withContact: boolean) {
    setBusy(true);
    const next = withContact && text.trim() !== saved ? text : undefined;
    const res = await submitForReview(slug, next).catch(() => null);
    setBusy(false);
    if (!res) {
      // No answer: it may have gone through anyway, so refresh to show where the hack stands.
      toast.error(NETWORK_ERROR);
      router.refresh();
      return;
    }
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <Modal title="Submitted for review" visible onClose={onClose}>
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-ready-soft">
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-ready [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:3]" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" className="anim-draw" />
            </svg>
          </span>
          <p className="text-sm text-text-2">We&rsquo;ll email you once it&rsquo;s approved.</p>
        </div>
        <NextSteps />
        <button type="button" onClick={onClose} className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-control bg-surface-2 text-sm font-semibold text-text transition-colors hover:bg-line">
          Back to my page
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Ready to submit?" visible onClose={onClose}>
      <p className="text-sm text-text-2">A volunteer will review your hack before it&rsquo;s listed.{saved ? " Check your verification contact first. Reviewers use it to confirm the hack is yours." : ""}</p>
      <div className={`mt-4 rounded-card border p-3.5 ${saved ? "border-line-strong" : "border-warn/40 bg-warn-soft"}`}>
        <h3 className="flex items-baseline justify-between text-[13px] font-semibold">
          {saved ? "Verification contact" : "Speed up verification"}
          {saved && !editingContact && (
            <button type="button" onClick={() => setEditingContact(true)} className="text-[13px] font-medium text-link hover:underline hover:underline-offset-[3px]">
              Edit
            </button>
          )}
        </h3>
        {!saved && <p className="mt-0.5 text-[12.5px] text-text-2">{CONTACT_HINT}</p>}
        {editingContact ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            aria-label="Verification contact"
            placeholder={"@yourname, active in RH Hideout\nor a link to your post about it"}
            className="mt-2 w-full resize-y rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-3 focus:border-accent focus:shadow-[0_0_0_3px_var(--rose-soft)]"
          />
        ) : (
          <p className="mt-2 whitespace-pre-line rounded-control bg-surface-2 px-3 py-2 text-sm">{saved}</p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {saved ? (
          <>
            <button type="button" onClick={onClose} className={QUIET}>Cancel</button>
            <button type="button" disabled={busy || !text.trim()} onClick={() => submit(true)} className={PRIMARY}>
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={busy} onClick={() => submit(false)} className={QUIET}>Submit without it</button>
            <button type="button" disabled={busy || !text.trim()} onClick={() => submit(true)} className={PRIMARY}>
              {busy ? "Submitting…" : "Save and submit"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** What happens after submitting; shared by the success screen and the review card. */
function NextSteps() {
  const steps = [
    ["A volunteer reviews your page and patch", null],
    ["They may reach out to confirm it’s yours", "Using your verification contact."],
    ["Once approved, it’s listed on Discover", "Edits you make now are included in the review."],
  ] as const;
  return (
    <ol className="mt-4 grid gap-2.5 text-left">
      {steps.map(([title, sub], i) => (
        <li key={title} className="grid grid-cols-[24px_1fr] gap-2.5 text-sm">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs font-bold text-text-2">{i + 1}</span>
          <span>
            {title}
            {sub && <small className="block text-[12.5px] text-text-3">{sub}</small>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Publishing checklist. Required items gate submission; recommended ones only nudge. In review it gives way to what happens next. */
export function DraftChecklist({ slug, stage, required, recommended, contact }: Omit<DraftStatusProps, "submittedAt">) {
  if (stage === "review") {
    return (
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 text-sm shadow-rest">
        <h2 className="text-base font-semibold">While you wait</h2>
        <p className="text-text-2">A volunteer reviews your page and patch. We&rsquo;ll email you once it&rsquo;s approved.</p>
        <div className="rounded-control bg-surface-2 px-3 py-2.5">
          <h3 className="flex items-baseline justify-between text-xs font-semibold text-text-2">
            Verification contact <EditDetailsLink />
          </h3>
          {contact?.trim() ? (
            <p className="mt-1 whitespace-pre-line">{contact}</p>
          ) : (
            <p className="mt-1 text-text-2">None yet. Adding one speeds up verification.</p>
          )}
        </div>
        <p className="text-text-3">Edits you make now are included in the review.</p>
      </section>
    );
  }
  const left = required.filter((r) => !r.done).length;
  const openRecommended = recommended.filter((r) => !r.done);
  return (
    <section className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4 shadow-rest">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{stage === "draft" ? "Before you submit" : "Listing health"}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${left === 0 ? "bg-ready-soft text-ready" : "bg-surface-2 text-text-2"}`}>
          {left === 0 ? (stage === "draft" ? "Ready" : "All good") : `${left} to do`}
        </span>
      </div>
      <Group title="Required" items={required} slug={slug} count={`${required.length - left}/${required.length}`} />
      {openRecommended.length > 0 && <Group title="Recommended" items={recommended} slug={slug} warn />}
    </section>
  );
}

function Group({ title, items, slug, count, warn = false }: { title: string; items: ChecklistItem[]; slug: string; count?: string; warn?: boolean }) {
  return (
    <div>
      <h3 className="mb-1.5 flex justify-between text-xs font-semibold text-text-3">
        {title} {count && <small className="font-medium tabular-nums">{count}</small>}
      </h3>
      <ul className="flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <li key={i.key} className={`flex items-start gap-2 leading-[1.35] ${i.done ? "text-text-3" : ""}`}>
            <span
              className={`mt-px inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full ${
                i.done ? "bg-ready text-on-ready" : warn ? "text-warn" : "border-[1.5px] border-line-strong"
              }`}
            >
              {i.done ? <FiCheck className="h-3.5 w-3.5" /> : warn ? <FiAlertCircle className="h-[13px] w-[13px]" /> : null}
            </span>
            {!i.done && i.href ? (
              <Link href={`/hack/${slug}/${i.href}`} className="underline decoration-line-strong underline-offset-[3px] hover:decoration-accent">
                {i.label}
              </Link>
            ) : (
              <span className={i.done ? "line-through decoration-line-strong" : ""}>{i.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

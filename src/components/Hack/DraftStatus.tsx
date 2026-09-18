"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FiAlertCircle, FiCheck, FiEdit3, FiEye } from "react-icons/fi";
import { submitForReview } from "@/app/submit/actions";
import { useDraftEditingOptional } from "@/components/Hack/Draft/DraftEditing";

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
}

const COPY: Record<DraftStage, { pill: string; tone: string }> = {
  draft: { pill: "Draft", tone: "bg-surface-2 text-text" },
  review: { pill: "In review", tone: "bg-accent-soft text-accent-text" },
  listed: { pill: "Listed", tone: "bg-ready-soft text-text" },
};

/** Strip at the top of a draft: where the hack stands, autosave state, preview, and Submit for review when the checklist is clear. */
export function DraftStatusStrip({ slug, stage, submittedAt, required, preview = false }: Omit<DraftStatusProps, "recommended">) {
  const router = useRouter();
  const editing = useDraftEditingOptional();
  const [busy, setBusy] = React.useState(false);
  const left = required.filter((r) => !r.done).length;
  const canSubmit = left === 0;
  const c = COPY[stage];

  async function submit() {
    setBusy(true);
    const res = await submitForReview(slug);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Submitted for review");
    router.refresh();
  }

  const text =
    stage === "draft" ? (
      <>Only you can see this page. {canSubmit ? "Everything required is in place." : `${left} required ${left === 1 ? "item" : "items"} left before you can submit.`}</>
    ) : stage === "review" ? (
      <>
        Submitted {submittedAt ? new Date(submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}. A volunteer will review it; edits you make now are included.
      </>
    ) : (
      <>Live. Changes publish as you save; new versions go through a quick check.</>
    );

  return (
    <div className="-mx-6 border-b border-line bg-surface px-6 md:mx-0 md:rounded-card md:border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm md:px-1">
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-1 text-[13px] font-semibold ${c.tone}`}>
          {stage === "listed" && <span className="ready-dot" />}
          {c.pill}
        </span>
        <p className="min-w-0 flex-1 text-text-2">{preview ? "Previewing as a player. This is what the page looks like once listed." : text}</p>
        {editing && editing.status !== "idle" && (
          <span className={`inline-flex items-center gap-1 text-xs ${editing.status === "error" ? "text-error" : "text-text-3"}`} aria-live="polite">
            {editing.status === "saved" && <FiCheck className="h-3.5 w-3.5 text-ready" />}
            {editing.status === "saving" ? "Saving…" : editing.status === "saved" ? "Saved" : "Couldn't save"}
          </span>
        )}
        <div className="flex flex-none items-center gap-2">
          {stage === "listed" ? (
            <Link href={`/hack/${slug}`} className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line">
              <FiCheck className="h-4 w-4" /> Done editing
            </Link>
          ) : preview ? (
            <Link href={`/hack/${slug}`} className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line">
              <FiEdit3 className="h-4 w-4" /> Back to editing
            </Link>
          ) : (
            <Link href={`/hack/${slug}?preview=1`} className="inline-flex h-[38px] items-center gap-1.5 rounded-control bg-surface-2 px-3 text-sm font-medium text-text transition-colors hover:bg-line">
              <FiEye className="h-4 w-4" /> Preview as a player
            </Link>
          )}
          {stage === "draft" && (
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={submit}
              className="inline-flex h-[38px] items-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Publishing checklist. Required items gate submission; recommended ones only nudge. */
export function DraftChecklist({ slug, stage, required, recommended }: Omit<DraftStatusProps, "submittedAt">) {
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

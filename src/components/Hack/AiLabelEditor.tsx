"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { FiEdit2, FiPlus } from "react-icons/fi";
import AiLabel from "@/components/Hack/AiLabel";
import AiDisclosureModal from "@/components/Hack/AiDisclosureModal";
import type { AiDisclosure, AiLevels } from "@/utils/aiDisclosure";

/**
 * The AI label as players see it, plus a pill that opens the disclosure form.
 * `onSave` decides where it goes (the page editor for drafts, a direct save on
 * the archive form) and returns the stored stamp, or null when it failed.
 * `?ai=1` opens the form on load (the dashboard's "Needs AI label" link).
 */
export default function AiLabelEditor({
  initial,
  emptyText,
  onSave,
}: {
  initial: AiDisclosure | null;
  emptyText: string;
  onSave: (levels: AiLevels, note: string | null) => Promise<{ disclosedAt: string } | null>;
}) {
  const [disclosure, setDisclosure] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  // After mount: the modal portals into document.body, which doesn't exist while server rendering.
  const openOnLoad = useSearchParams().get("ai") === "1";
  React.useEffect(() => {
    if (openOnLoad) setOpen(true);
  }, [openOnLoad]);
  const Icon = disclosure ? FiEdit2 : FiPlus;

  return (
    <>
      {disclosure ? (
        <AiLabel disclosure={disclosure} />
      ) : (
        <p className="rounded-card border border-dashed border-line-strong px-3.5 py-3 text-[13px] leading-[1.45] text-text-3">{emptyText}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-[3px] text-[13px] font-medium leading-tight text-text-2 transition-colors hover:border-solid hover:border-text-3 hover:bg-surface hover:text-text"
      >
        <Icon className="h-3 w-3" /> {disclosure ? "Edit AI label" : "Add AI label"}
      </button>

      <AiDisclosureModal
        visible={open}
        initial={disclosure}
        onClose={() => setOpen(false)}
        onSave={async (levels, note) => {
          const saved = await onSave(levels, note);
          if (saved) setDisclosure({ levels, note, disclosedAt: saved.disclosedAt });
          return saved !== null;
        }}
      />
    </>
  );
}

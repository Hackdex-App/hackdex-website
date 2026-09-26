"use client";

import React from "react";
import { FiEdit2, FiPlus } from "react-icons/fi";
import AiLabel from "@/components/Hack/AiLabel";
import AiDisclosureModal from "@/components/Hack/AiDisclosureModal";
import type { AiDisclosure } from "@/utils/aiDisclosure";
import { useDraftEditing } from "./DraftEditing";

/**
 * The AI label as players see it, plus a pill that opens the disclosure form.
 * Saves through the page's editor, so drafts save right away and listed hacks
 * stage it until Save changes; the label shows the new answers either way.
 */
export default function DraftAiLabel({ initial }: { initial: AiDisclosure | null }) {
  const { save } = useDraftEditing();
  const [disclosure, setDisclosure] = React.useState(initial);
  const [open, setOpen] = React.useState(false);
  const Icon = disclosure ? FiEdit2 : FiPlus;

  return (
    <>
      {disclosure ? (
        <AiLabel disclosure={disclosure} />
      ) : (
        <p className="rounded-card border border-dashed border-line-strong px-3.5 py-3 text-[13px] leading-[1.45] text-text-3">
          Players see here how much AI went into the hack. Every hack needs one, even with no AI use.
        </p>
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
          const ok = await save({ ai: { levels, note } });
          if (ok) setDisclosure({ levels, note, disclosedAt: new Date().toISOString() });
          return ok;
        }}
      />
    </>
  );
}

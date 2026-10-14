"use client";

import AiLabelEditor from "@/components/Hack/AiLabelEditor";
import type { AiDisclosure } from "@/utils/aiDisclosure";
import { useDraftEditing } from "./DraftEditing";

/** The AI label on the in-place editor. Saves through the page, so drafts save right away and listed hacks stage it until Save changes. */
export default function DraftAiLabel({ initial }: { initial: AiDisclosure | null }) {
  const { save } = useDraftEditing();
  return (
    <AiLabelEditor
      initial={initial}
      emptyText="Players see here how much AI went into the hack. Every hack needs one, even with no AI use."
      onSave={async (levels, note) => ((await save({ ai: { levels, note } })) ? { disclosedAt: new Date().toISOString() } : null)}
    />
  );
}

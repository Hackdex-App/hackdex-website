"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateHack } from "@/app/hack/actions";
import AiLabelEditor from "@/components/Hack/AiLabelEditor";
import type { AiDisclosure } from "@/utils/aiDisclosure";

/** AI label on the archive edit page. Archives use the older form, so this saves on its own. */
export default function ArchiveAiLabel({ slug, initial }: { slug: string; initial: AiDisclosure | null }) {
  const router = useRouter();
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-[15px] font-semibold">AI label</h2>
      <p className="mb-3 mt-1 text-[13px] text-text-2">Fill this in if you know how the original creator used AI. Leave it empty if you don&rsquo;t.</p>
      <div className="max-w-[320px]">
        <AiLabelEditor
          initial={initial}
          emptyText="No AI label yet. Players see that the creator hasn't filled it in."
          onSave={async (levels, note) => {
            const res = await updateHack({ slug, ai: { levels, note } });
            if (!res.ok) {
              toast.error(res.error);
              return null;
            }
            router.refresh();
            return { disclosedAt: res.aiDisclosedAt ?? new Date().toISOString() };
          }}
        />
      </div>
    </section>
  );
}

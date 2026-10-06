"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/Primitives/Modal";
import { deleteHack } from "@/app/hack/actions";
import { parseHackRedirect } from "@/utils/hackRedirect";

interface DeleteHackModalProps {
  slug: string;
  onClose: () => void;
}

/** Admin confirmation for soft-deleting a hack, with an optional redirect for its old URL. */
export default function DeleteHackModal({ slug, onClose }: DeleteHackModalProps) {
  const router = useRouter();
  const [redirectUrl, setRedirectUrl] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const parsed = parseHackRedirect(redirectUrl, slug);
  const error = (!parsed.ok && parsed.error) || serverError;
  const canDelete = parsed.ok && confirmation.trim() === slug && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const result = await deleteHack({ slug, redirectUrl });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      toast.success("Hack deleted");
      router.push("/dashboard");
    } catch {
      setServerError("Couldn't delete the hack. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible title="Delete this hack?" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-2">
          It disappears from Discover and the creator&rsquo;s dashboard, and its page 404s for everyone, admins included.
          Its files stay, but only a database edit can bring it back.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Redirect to <span className="text-xs font-normal text-text-3">(optional)</span>
          </span>
          <input
            type="text"
            inputMode="url"
            value={redirectUrl}
            onChange={(e) => {
              setRedirectUrl(e.target.value);
              setServerError(null);
            }}
            placeholder="/hack/new-slug or https://…"
            aria-invalid={!!error}
            className="h-10 w-full rounded-control border border-line bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40 aria-invalid:border-error/60"
          />
          <span className="text-xs text-text-3">Visitors to this hack&rsquo;s page go here instead of a 404.</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Type <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[13px]">{slug}</code> to confirm
          </span>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDelete();
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-10 w-full rounded-control border border-line bg-surface-2 px-3 font-mono text-sm text-text outline-none transition-[border-color,box-shadow] focus:border-line-strong focus:ring-2 focus:ring-accent/40"
          />
        </label>

        {error && <p className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong px-4 text-sm font-medium text-text-2 outline-none transition-colors hover:enabled:border-text-3 hover:enabled:text-text focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="inline-flex h-11 w-full items-center justify-center rounded-control bg-error px-4 text-sm font-semibold text-white outline-none transition-[background-color,opacity] hover:enabled:bg-error/90 focus-visible:ring-2 focus-visible:ring-error/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete hack"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

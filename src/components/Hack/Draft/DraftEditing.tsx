"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateHack } from "@/app/hack/actions";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type Result = { ok: true } | { ok: false; error: string };
type UpdateArgs = Omit<Parameters<typeof updateHack>[0], "slug">;

interface DraftEditing {
  slug: string;
  status: SaveStatus;
  /** Runs a save, reflects it in the status strip, and refreshes server data (checklist, counts) once it lands. */
  run: (work: () => Promise<Result>) => Promise<boolean>;
  /** Partial hack update through the same path. */
  save: (args: UpdateArgs) => Promise<boolean>;
}

const Ctx = React.createContext<DraftEditing | null>(null);

/** Shared autosave plumbing for every editing island on a draft page. */
export function DraftEditingProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const inFlight = React.useRef(0);
  const refreshTimer = React.useRef<number | undefined>(undefined);

  const run = React.useCallback<DraftEditing["run"]>(
    async (work) => {
      inFlight.current += 1;
      setStatus("saving");
      const res = await work();
      inFlight.current -= 1;
      if (!res.ok) {
        setStatus("error");
        toast.error(res.error);
        return false;
      }
      if (inFlight.current === 0) setStatus("saved");
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 500);
      return true;
    },
    [router],
  );
  const save = React.useCallback<DraftEditing["save"]>((args) => run(() => updateHack({ slug, ...args })), [run, slug]);

  const value = React.useMemo(() => ({ slug, status, run, save }), [slug, status, run, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraftEditing() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDraftEditing must be used inside DraftEditingProvider");
  return ctx;
}

/** Same as useDraftEditing, but null outside a draft page (the strip is also used on listed hacks). */
export function useDraftEditingOptional() {
  return React.useContext(Ctx);
}

/** Calls commit with the latest value once it has stopped changing for `delay` ms. Skips the initial value. */
export function useAutosave<T>(value: T, commit: (value: T) => void, delay = 800) {
  const first = React.useRef(true);
  const commitRef = React.useRef(commit);
  commitRef.current = commit;
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => commitRef.current(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
}

export const FIELD = "w-full rounded-control border border-line bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40";

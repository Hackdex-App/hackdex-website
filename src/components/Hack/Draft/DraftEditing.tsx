"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateHack } from "@/app/hack/actions";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type Result = { ok: true } | { ok: false; error: string };
type UpdateArgs = Omit<Parameters<typeof updateHack>[0], "slug">;
type Committer = { dirty: boolean; commit: () => Promise<Result> };

interface DraftEditing {
  slug: string;
  /** Drafts save as you go. Listed hacks stage changes until Save, since every save publishes. */
  live: boolean;
  status: SaveStatus;
  /** Manual mode only: something is staged and not yet saved. */
  dirty: boolean;
  /** Runs a save now, reflects it in the strip, and refreshes server data once it lands. */
  run: (work: () => Promise<Result>) => Promise<boolean>;
  /** Partial hack update. Live: saves now. Manual: stages for Save. */
  save: (args: UpdateArgs) => Promise<boolean>;
  /** Manual mode: writes the staged fields, then every registered committer. */
  saveAll: () => Promise<boolean>;
  register: (id: string, committer: Committer | null) => void;
}

const Ctx = React.createContext<DraftEditing | null>(null);

/** Shared save plumbing for every editing island on a hack page in edit mode. */
export function DraftEditingProvider({ slug, live, children }: { slug: string; live: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [pending, setPending] = React.useState<UpdateArgs>({});
  const [committerDirty, setCommitterDirty] = React.useState(0);
  const committers = React.useRef(new Map<string, Committer>());
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

  const save = React.useCallback<DraftEditing["save"]>(
    async (args) => {
      if (live) return run(() => updateHack({ slug, ...args }));
      setPending((prev) => ({ ...prev, ...args }));
      return true;
    },
    [live, run, slug],
  );

  const register = React.useCallback<DraftEditing["register"]>((id, committer) => {
    if (committer) committers.current.set(id, committer);
    else committers.current.delete(id);
    setCommitterDirty([...committers.current.values()].filter((c) => c.dirty).length);
  }, []);

  const saveAll = React.useCallback(async () => {
    const fields = pending;
    const work = [...committers.current.values()].filter((c) => c.dirty).map((c) => c.commit);
    const ok = await run(async () => {
      if (Object.keys(fields).length > 0) {
        const res = await updateHack({ slug, ...fields });
        if (!res.ok) return res;
      }
      for (const commit of work) {
        const res = await commit();
        if (!res.ok) return res;
      }
      return { ok: true };
    });
    if (ok) {
      setPending({});
      toast.success("Changes published");
    }
    return ok;
  }, [pending, run, slug]);

  const dirty = !live && (Object.keys(pending).length > 0 || committerDirty > 0);

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const value = React.useMemo(() => ({ slug, live, status, dirty, run, save, saveAll, register }), [slug, live, status, dirty, run, save, saveAll, register]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraftEditing() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useDraftEditing must be used inside DraftEditingProvider");
  return ctx;
}

/** Same as useDraftEditing, but null outside edit mode (the strip is also rendered in draft preview). */
export function useDraftEditingOptional() {
  return React.useContext(Ctx);
}

/** Registers work that runs on Save in manual mode, e.g. uploading staged screenshots. */
export function useCommitter(dirty: boolean, commit: () => Promise<Result>) {
  const { register } = useDraftEditing();
  const id = React.useId();
  const commitRef = React.useRef(commit);
  commitRef.current = commit;
  React.useEffect(() => {
    register(id, { dirty, commit: () => commitRef.current() });
    return () => register(id, null);
  }, [id, dirty, register]);
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

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateHack } from "@/app/hack/actions";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type Result = { ok: true } | { ok: false; error: string };
type UpdateArgs = Omit<Parameters<typeof updateHack>[0], "slug">;
/** `prepare` does the failure-prone work (uploads) before anything publishes; `commit` writes to the page. */
type Committer = { dirty: boolean; prepare: () => Promise<Result>; commit: () => Promise<Result> };

interface DraftEditing {
  slug: string;
  /** Drafts save as you go. Listed hacks stage changes until Save, since every save publishes. */
  live: boolean;
  status: SaveStatus;
  /** Manual mode only: something is staged and not yet saved. */
  dirty: boolean;
  /** Live mode: saves that failed and haven't been superseded by a later one. */
  failed: boolean;
  /**
   * Runs a save now, reflects it in the strip, and refreshes server data once it lands.
   * `key` names what it writes (e.g. "title"): a failure is kept for retry until a later save of the same key lands.
   */
  run: (work: () => Promise<Result>, key?: string) => Promise<boolean>;
  /** Reruns every failed save. */
  retry: () => void;
  /** Partial hack update. Live: saves now. Manual: stages for Save. */
  save: (args: UpdateArgs) => Promise<boolean>;
  /** Manual mode: runs every committer's prepare, then writes the staged fields and the commits. */
  saveAll: () => Promise<boolean>;
  register: (id: string, committer: Committer | null) => void;
  /** useAutosave reports a change waiting out its debounce (+1) and leaving it (-1), so reloads can warn. */
  trackWaiting: (delta: 1 | -1) => void;
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
  // Saves are whole-value writes, so retrying the latest failed one per key is safe.
  const failedSaves = React.useRef(new Map<string, () => Promise<Result>>());
  const [failedCount, setFailedCount] = React.useState(0);
  const waitingAutosaves = React.useRef(0);
  const trackWaiting = React.useCallback((delta: 1 | -1) => {
    waitingAutosaves.current += delta;
  }, []);

  const run = React.useCallback<DraftEditing["run"]>(
    async (work, key) => {
      inFlight.current += 1;
      setStatus("saving");
      // Server actions throw on network failures; without this the strip stuck on "Saving…".
      let res: Result;
      try {
        res = await work();
      } catch {
        res = { ok: false, error: "Couldn't reach Hackdex. Check your connection and try again." };
      } finally {
        inFlight.current -= 1;
      }
      if (key) {
        if (res.ok) failedSaves.current.delete(key);
        else failedSaves.current.set(key, work);
        setFailedCount(failedSaves.current.size);
      }
      if (!res.ok) {
        setStatus("error");
        toast.error(res.error);
        return false;
      }
      // A save that lands doesn't clear an earlier failure: keep "Couldn't save" and Retry until that one lands too.
      if (inFlight.current === 0) setStatus(failedSaves.current.size > 0 ? "error" : "saved");
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => router.refresh(), 500);
      return true;
    },
    [router],
  );

  const save = React.useCallback<DraftEditing["save"]>(
    async (args) => {
      if (live) return run(() => updateHack({ slug, ...args }), Object.keys(args).sort().join());
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
    const work = [...committers.current.values()].filter((c) => c.dirty);
    const ok = await run(async () => {
      // Uploads first, so a failed one leaves the published page untouched.
      for (const c of work) {
        const res = await c.prepare();
        if (!res.ok) return res;
      }
      if (Object.keys(fields).length > 0) {
        const res = await updateHack({ slug, ...fields });
        if (!res.ok) return res;
      }
      for (const c of work) {
        const res = await c.commit();
        if (!res.ok) return res;
      }
      return { ok: true };
    });
    if (ok) {
      // Keep anything edited while the save was running.
      setPending((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(fields) as (keyof UpdateArgs)[]) if (next[k] === fields[k]) delete next[k];
        return next;
      });
      toast.success("Changes published");
    }
    return ok;
  }, [pending, run, slug]);

  const retry = React.useCallback(() => {
    for (const [key, work] of failedSaves.current) void run(work, key);
  }, [run]);

  const dirty = !live && (Object.keys(pending).length > 0 || committerDirty > 0);
  const failed = live && failedCount > 0;
  useLeaveGuard(dirty || failed);

  // Live edits are unsaved for a moment (debounce, then the request); a reload then would drop them.
  React.useEffect(() => {
    if (!live) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (waitingAutosaves.current > 0 || inFlight.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [live]);

  const value = React.useMemo(
    () => ({ slug, live, status, dirty, failed, run, retry, save, saveAll, register, trackWaiting }),
    [slug, live, status, dirty, failed, run, retry, save, saveAll, register, trackWaiting],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Asks before leaving with unsaved work: beforeunload for reloads and other sites,
 * and a capture-phase click check for in-app links, which never fire beforeunload.
 */
function useLeaveGuard(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    let leaving = false;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!leaving) e.preventDefault();
    };
    // Runs before React's handlers, so preventDefault here stops next/link too.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      if (window.confirm("Discard your unsaved changes?")) leaving = true;
      else {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
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

/** Registers work that runs on Save in manual mode: `prepare` (e.g. uploading staged screenshots) runs before anything publishes. */
export function useCommitter(dirty: boolean, commit: () => Promise<Result>, prepare?: () => Promise<Result>) {
  const { register } = useDraftEditing();
  const id = React.useId();
  const commitRef = React.useRef(commit);
  const prepareRef = React.useRef(prepare);
  commitRef.current = commit;
  prepareRef.current = prepare;
  React.useEffect(() => {
    register(id, { dirty, prepare: () => prepareRef.current?.() ?? Promise.resolve({ ok: true }), commit: () => commitRef.current() });
    return () => register(id, null);
  }, [id, dirty, register]);
}

/**
 * Calls commit with the latest value once it has stopped changing for `delay` ms (drafts) or right
 * away (listed hacks, which only stage). Skips the initial value and flushes a pending one on unmount.
 */
export function useAutosave<T>(value: T, commit: (value: T) => void, delay = 800) {
  // Listed hacks only stage (nothing is sent), so do it right away and Save always has the last edit.
  const { live, trackWaiting } = useDraftEditing();
  const wait = live ? delay : 0;
  const last = React.useRef(value);
  const waiting = React.useRef(false);
  const commitRef = React.useRef(commit);
  commitRef.current = commit;
  const setWaiting = React.useCallback(
    (next: boolean) => {
      if (waiting.current !== next) trackWaiting(next ? 1 : -1);
      waiting.current = next;
    },
    [trackWaiting],
  );
  React.useEffect(() => {
    if (Object.is(value, last.current)) return;
    last.current = value;
    setWaiting(true);
    const t = window.setTimeout(() => {
      setWaiting(false);
      commitRef.current(value);
    }, wait);
    return () => window.clearTimeout(t);
  }, [value, wait, setWaiting]);
  // Commit a change still waiting when the editor goes away, e.g. clicking Preview mid-typing.
  React.useEffect(
    () => () => {
      if (!waiting.current) return;
      setWaiting(false);
      commitRef.current(last.current);
    },
    [setWaiting],
  );
}

export const FIELD = "w-full rounded-control border border-line bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40";

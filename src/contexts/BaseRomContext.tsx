"use client";

import React from "react";
import { getAllRomEntries, setRomHandle, deleteRomHandle, getRomBlob, setRomBlob, deleteRomBlob, getAllBlobEntries } from "@/utils/idb";
import { sha1Hex } from "@/utils/hash";
import { baseRoms } from "@/data/baseRoms";

type ContextValue = {
  supported: boolean;
  linked: Record<string, any>;
  statuses: Record<string, "granted" | "prompt" | "denied" | "error">;
  cached: Record<string, boolean>;
  countLinked: number;
  countGranted: number;
  countReady: number;
  totalCachedBytes: number;
  isLinked: (id: string) => boolean;
  hasPermission: (id: string) => boolean;
  hasCached: (id: string) => boolean;
  getHandle: (id: string) => any | null;
  linkRom: (id: string) => Promise<void>;
  unlinkRom: (id: string) => Promise<void>;
  ensurePermission: (id: string, request?: boolean) => Promise<"granted" | "prompt" | "denied" | "error">;
  getFileBlob: (id: string) => Promise<File | null>;
  importToCache: (id: string) => Promise<void>;
  removeFromCache: (id: string) => Promise<void>;
  importUploadedBlob: (file: File) => Promise<string | null>; // returns matched id
};

const BaseRomContext = React.createContext<ContextValue | null>(null);

export function BaseRomProvider({ children }: { children: React.ReactNode }) {
  const supported = typeof window !== "undefined" && "showOpenFilePicker" in window;
  const [linked, setLinked] = React.useState<Record<string, any>>({});
  const [statuses, setStatuses] = React.useState<Record<string, "granted" | "prompt" | "denied" | "error">>({});
  const [cached, setCached] = React.useState<Record<string, boolean>>({});
  const [totalCachedBytes, setTotalCachedBytes] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      try {
        const rows = await getAllRomEntries();
        const map: Record<string, any> = {};
        const st: Record<string, "granted" | "prompt" | "denied" | "error"> = {};
        const cacheState: Record<string, boolean> = {};
        for (const r of rows) {
          map[r.id] = r.handle;
          try {
            const perm = r.handle?.queryPermission?.({ mode: "read" });
            let state: any = "prompt";
            if (perm && typeof perm.then === "function") {
              const result = await perm;
              state = result;
            }
            st[r.id] = state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
          } catch {
            st[r.id] = "error";
          }
        }
        // Check existing blobs for all known bases (and linked ones)
        const blobRows = await getAllBlobEntries();
        let total = 0;
        for (const row of blobRows) {
          cacheState[row.id] = true;
          total += row.blob?.size ?? 0;
        }
        setLinked(map);
        setStatuses(st);
        setCached(cacheState);
        setTotalCachedBytes(total);
      } catch (e) {
        // noop
      }
    })();
  }, []);

  function isLinked(id: string) {
    return Boolean(linked[id]);
  }

  function getHandle(id: string) {
    return linked[id] ?? null;
  }

  function hasPermission(id: string) {
    return statuses[id] === "granted";
  }

  function hasCached(id: string) {
    return Boolean(cached[id]);
  }

  async function linkRom(id: string) {
    if (!supported) {
      // Fallback: use an <input type="file"> to allow selecting a ROM and cache it if recognized
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".gba,.gbc,.gb,.nds,application/octet-stream";
        input.multiple = false;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (file) {
            try {
              const hash = await sha1Hex(file);
              const match = baseRoms.find((r) => r.sha1 && r.sha1.toLowerCase() === hash.toLowerCase());
              if (match) {
                await setRomBlob(match.id, file);
                setCached((prev) => ({ ...prev, [match.id]: true }));
                setTotalCachedBytes((n) => n + file.size);
              }
            } catch {}
          }
          if (input.parentNode) input.parentNode.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
      } catch {}
      return;
    }
    try {
      // @ts-ignore - File System Access types
      const [handle] = await (window as any).showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "ROM files",
            accept: {
              "application/octet-stream": [".gba", ".gbc", ".gb", ".nds"],
            },
          },
        ],
      });
      if (!handle) return;
      // Ensure read permission
      if (handle.queryPermission) {
        const q = await handle.queryPermission({ mode: "read" });
        if (q !== "granted" && handle.requestPermission) {
          await handle.requestPermission({ mode: "read" });
        }
      }
      await setRomHandle(id, handle);
      setLinked((prev) => ({ ...prev, [id]: handle }));
      try {
        const q = await handle.queryPermission?.({ mode: "read" });
        setStatuses((prev) => ({ ...prev, [id]: q === "granted" ? "granted" : q === "denied" ? "denied" : "prompt" }));
      } catch {
        setStatuses((prev) => ({ ...prev, [id]: "error" }));
      }
    } catch (e) {
      // canceled or failed
    }
  }

  async function unlinkRom(id: string) {
    try {
      await deleteRomHandle(id);
      setLinked((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setStatuses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Note: keep cached copy unless explicitly removed
    } catch (e) {
      // noop
    }
  }

  async function ensurePermission(id: string, request = false) {
    const handle = linked[id];
    if (!handle) return "error";
    try {
      let state = await handle.queryPermission?.({ mode: "read" });
      if (state !== "granted" && request && handle.requestPermission) {
        state = await handle.requestPermission({ mode: "read" });
      }
      const mapped = state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
      setStatuses((prev) => ({ ...prev, [id]: mapped }));
      return mapped;
    } catch {
      setStatuses((prev) => ({ ...prev, [id]: "error" }));
      return "error";
    }
  }

  async function getFileBlob(id: string): Promise<File | null> {
    // Prefer cached
    const cachedBlob = await getRomBlob(id);
    if (cachedBlob) return new File([cachedBlob], id);
    const handle = linked[id];
    if (!handle) return null;
    try {
      const file = await handle.getFile();
      return file as File;
    } catch {
      // maybe moved/permission revoked
      return null;
    }
  }

  async function importToCache(id: string) {
    const handle = linked[id];
    if (!handle) return;
    try {
      const file = await handle.getFile();
      await setRomBlob(id, file);
      setCached((prev) => ({ ...prev, [id]: true }));
      setTotalCachedBytes((n) => n + file.size);
    } catch {
      // noop
    }
  }

  async function removeFromCache(id: string) {
    try {
      await deleteRomBlob(id);
      setCached((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // We cannot easily know the blob size now; recalc total
      try {
        const rows = await getAllBlobEntries();
        let total = 0;
        for (const r of rows) total += r.blob?.size ?? 0;
        setTotalCachedBytes(total);
      } catch {}
    } catch {
      // noop
    }
  }

  // Accept a user-uploaded base ROM, hash it, and if it matches a known base ROM, cache it under that id
  async function importUploadedBlob(file: File): Promise<string | null> {
    try {
      const hash = await sha1Hex(file);
      const match = baseRoms.find((r) => r.sha1 && r.sha1.toLowerCase() === hash.toLowerCase());
      if (!match) return null;
      await setRomBlob(match.id, file);
      setCached((prev) => ({ ...prev, [match.id]: true }));
      setTotalCachedBytes((n) => n + file.size);
      return match.id;
    } catch {
      return null;
    }
  }

  // Guardrailed auto-cache: cache on link if within quota and not huge
  React.useEffect(() => {
    const names = Object.keys(linked);
    (async () => {
      try {
        const estimate = await (navigator.storage?.estimate?.() ?? Promise.resolve(undefined));
        const quota = estimate?.quota ?? Infinity;
        const usage = estimate?.usage ?? totalCachedBytes;
        const headroom = quota - usage;
        for (const id of names) {
          if (cached[id]) continue;
          const handle = linked[id];
          if (!handle) continue;
          try {
            const file = await handle.getFile();
            const size = file.size;
            const smallEnough = size <= 128 * 1024 * 1024; // 128MB default
            const hasRoom = headroom > size * 1.2 && headroom > 64 * 1024 * 1024; // some buffer
            if (smallEnough && hasRoom) {
              await setRomBlob(id, file);
              setCached((prev) => ({ ...prev, [id]: true }));
              setTotalCachedBytes((n) => n + size);
            }
          } catch {}
        }
      } catch {}
    })();
  }, [linked, cached, totalCachedBytes]);

  const readyNames = new Set<string>();
  Object.entries(cached).forEach(([n, v]) => v && readyNames.add(n));
  Object.entries(statuses).forEach(([n, s]) => s === "granted" && readyNames.add(n));

  const value: ContextValue = {
    supported,
    linked,
    statuses,
    cached,
    countLinked: Object.keys(linked).length,
    countGranted: Object.values(statuses).filter((s) => s === "granted").length,
    countReady: readyNames.size,
    totalCachedBytes,
    isLinked,
    hasPermission,
    hasCached,
    getHandle,
    linkRom,
    unlinkRom,
    ensurePermission,
    getFileBlob,
    importToCache,
    removeFromCache,
    importUploadedBlob,
  };

  return <BaseRomContext.Provider value={value}>{children}</BaseRomContext.Provider>;
}

export function useBaseRoms() {
  const ctx = React.useContext(BaseRomContext);
  if (!ctx) throw new Error("useBaseRoms must be used within BaseRomProvider");
  return ctx;
}



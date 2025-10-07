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
  isLinked: (name: string) => boolean;
  hasPermission: (name: string) => boolean;
  hasCached: (name: string) => boolean;
  getHandle: (name: string) => any | null;
  linkRom: (name: string) => Promise<void>;
  unlinkRom: (name: string) => Promise<void>;
  ensurePermission: (name: string, request?: boolean) => Promise<"granted" | "prompt" | "denied" | "error">;
  getFileBlob: (name: string) => Promise<File | null>;
  importToCache: (name: string) => Promise<void>;
  removeFromCache: (name: string) => Promise<void>;
  importUploadedBlob: (file: File) => Promise<string | null>; // returns matched name
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
          map[r.name] = r.handle;
          try {
            const perm = r.handle?.queryPermission?.({ mode: "read" });
            let state: any = "prompt";
            if (perm && typeof perm.then === "function") {
              const result = await perm;
              state = result;
            }
            st[r.name] = state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
          } catch {
            st[r.name] = "error";
          }
        }
        // Check existing blobs for all known bases (and linked ones)
        const blobRows = await getAllBlobEntries();
        let total = 0;
        for (const row of blobRows) {
          cacheState[row.name] = true;
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

  function isLinked(name: string) {
    return Boolean(linked[name]);
  }

  function getHandle(name: string) {
    return linked[name] ?? null;
  }

  function hasPermission(name: string) {
    return statuses[name] === "granted";
  }

  function hasCached(name: string) {
    return Boolean(cached[name]);
  }

  async function linkRom(name: string) {
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
                await setRomBlob(match.name, file);
                setCached((prev) => ({ ...prev, [match.name]: true }));
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
      await setRomHandle(name, handle);
      setLinked((prev) => ({ ...prev, [name]: handle }));
      try {
        const q = await handle.queryPermission?.({ mode: "read" });
        setStatuses((prev) => ({ ...prev, [name]: q === "granted" ? "granted" : q === "denied" ? "denied" : "prompt" }));
      } catch {
        setStatuses((prev) => ({ ...prev, [name]: "error" }));
      }
    } catch (e) {
      // canceled or failed
    }
  }

  async function unlinkRom(name: string) {
    try {
      await deleteRomHandle(name);
      setLinked((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setStatuses((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      // Note: keep cached copy unless explicitly removed
    } catch (e) {
      // noop
    }
  }

  async function ensurePermission(name: string, request = false) {
    const handle = linked[name];
    if (!handle) return "error";
    try {
      let state = await handle.queryPermission?.({ mode: "read" });
      if (state !== "granted" && request && handle.requestPermission) {
        state = await handle.requestPermission({ mode: "read" });
      }
      const mapped = state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
      setStatuses((prev) => ({ ...prev, [name]: mapped }));
      return mapped;
    } catch {
      setStatuses((prev) => ({ ...prev, [name]: "error" }));
      return "error";
    }
  }

  async function getFileBlob(name: string): Promise<File | null> {
    // Prefer cached
    const cachedBlob = await getRomBlob(name);
    if (cachedBlob) return new File([cachedBlob], name);
    const handle = linked[name];
    if (!handle) return null;
    try {
      const file = await handle.getFile();
      return file as File;
    } catch {
      // maybe moved/permission revoked
      return null;
    }
  }

  async function importToCache(name: string) {
    const handle = linked[name];
    if (!handle) return;
    try {
      const file = await handle.getFile();
      await setRomBlob(name, file);
      setCached((prev) => ({ ...prev, [name]: true }));
      setTotalCachedBytes((n) => n + file.size);
    } catch {
      // noop
    }
  }

  async function removeFromCache(name: string) {
    try {
      await deleteRomBlob(name);
      setCached((prev) => {
        const next = { ...prev };
        delete next[name];
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

  // Accept a user-uploaded base ROM, hash it, and if it matches a known base ROM, cache it under that name
  async function importUploadedBlob(file: File): Promise<string | null> {
    try {
      const hash = await sha1Hex(file);
      const match = baseRoms.find((r) => r.sha1 && r.sha1.toLowerCase() === hash.toLowerCase());
      if (!match) return null;
      await setRomBlob(match.name, file);
      setCached((prev) => ({ ...prev, [match.name]: true }));
      setTotalCachedBytes((n) => n + file.size);
      return match.name;
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
        for (const name of names) {
          if (cached[name]) continue;
          const handle = linked[name];
          if (!handle) continue;
          try {
            const file = await handle.getFile();
            const size = file.size;
            const smallEnough = size <= 128 * 1024 * 1024; // 128MB default
            const hasRoom = headroom > size * 1.2 && headroom > 64 * 1024 * 1024; // some buffer
            if (smallEnough && hasRoom) {
              await setRomBlob(name, file);
              setCached((prev) => ({ ...prev, [name]: true }));
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



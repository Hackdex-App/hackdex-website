// Minimal IndexedDB helpers for storing FileSystemFileHandle references
import type { Platform } from "@/data/baseRoms";
import { PLATFORMS } from "@/data/baseRoms";

const DB_NAME = "hackdex";
const DB_VERSION = 2;
const STORE = "base_roms";
const BLOB_STORE = "base_rom_blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function setRomHandle(id: string, handle: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put({ id, handle, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRomHandle(id: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.handle ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllRomEntries(): Promise<Array<{ id: string; handle: any }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result as any[]) || [];
      resolve(rows.map((r) => ({ id: r.id, handle: r.handle })));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRomHandle(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function setRomBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    const store = tx.objectStore(BLOB_STORE);
    store.put({ id, blob, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRomBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const store = tx.objectStore(BLOB_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteRomBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    const store = tx.objectStore(BLOB_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllBlobEntries(): Promise<Array<{ id: string; blob: Blob; updatedAt?: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readonly");
    const store = tx.objectStore(BLOB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as any[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export function platformAccept(p: Platform | Platform[]): string {
  if (Array.isArray(p)) {
    // Gather all individual extensions and dedupe
    const extSet = new Set<string>();
    for (const plat of p) {
      const exts = platformAccept(plat).split(",");
      for (const ext of exts) {
        extSet.add(ext.trim());
      }
    }
    return Array.from(extSet).join(",");
  }

  // Exhaustive check using a mapping object for platform strings
  const mapping: Record<Platform, string> = {
    GB: ".gb",
    GBC: ".gbc,.gb",
    GBA: ".gba",
    NDS: ".nds",
  };

  // If `p` is not a valid Platform, TypeScript will error here.
  return mapping[p];
}

export function platformAcceptAll(): string {
  return platformAccept([...PLATFORMS]);
}

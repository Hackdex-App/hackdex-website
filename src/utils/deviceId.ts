const DEVICE_ID_STORAGE_KEY = "deviceId";

function createDeviceId(): string | null {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Insecure-context local dev only. Must stay five hyphen-separated segments.
  if (process.env.NODE_ENV === "development") {
    return `dev-${Date.now()}-0-0-0`;
  }
  return null;
}

function isDevFallbackId(id: string): boolean {
  return id.startsWith("dev-");
}

export function getOrCreateDeviceId(): string | null {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  const isStaleDevFallback =
    !!existing && isDevFallbackId(existing) && process.env.NODE_ENV !== "development";

  if (existing && !isStaleDevFallback) return existing;

  const created = createDeviceId();
  if (created) {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  }

  if (isStaleDevFallback) {
    localStorage.removeItem(DEVICE_ID_STORAGE_KEY);
  }
  return null;
}

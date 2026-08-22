export type ProbeResult = "ok" | "failed" | "timeout" | "skipped";

export type FetchFailurePhase = "request" | "response" | "body";

export type FetchDiagnostics = {
  nextHopProtocol: string | null;
  transferSize: number | null;
  durationMs: number | null;
  timingEntryPresent: boolean;
  encodedBodySize: number | null;
  decodedBodySize: number | null;
};

export type ResponseMetadata = {
  responseStatus: number | null;
  contentLength: number | null;
  contentEncoding: string | null;
  contentType: string | null;
};

export class HTTPError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = "HTTPError";
    this.status = status;
  }
}

function emptyDiagnostics(
  fallbackDurationMs: number | null,
  timingEntryPresent: boolean,
): FetchDiagnostics {
  return {
    nextHopProtocol: null,
    transferSize: null,
    durationMs: fallbackDurationMs,
    timingEntryPresent,
    encodedBodySize: null,
    decodedBodySize: null,
  };
}

function parseContentLength(raw: string | null): number | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

export function collectResponseMetadata(res: Response): ResponseMetadata {
  return {
    responseStatus: Number.isInteger(res.status) ? res.status : null,
    contentLength: parseContentLength(res.headers.get("content-length")),
    contentEncoding: res.headers.get("content-encoding") || null,
    contentType: res.headers.get("content-type") || null,
  };
}

export function collectFetchDiagnostics(
  url: string,
  fallbackDurationMs: number,
): FetchDiagnostics {
  try {
    if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
      return emptyDiagnostics(fallbackDurationMs, false);
    }

    const entries = performance.getEntriesByName(url);
    const last = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
    if (!last) {
      return emptyDiagnostics(fallbackDurationMs, false);
    }

    // nextHopProtocol is empty when the Timing-Allow-Origin check fails; size
    // fields are then 0 and must not be stored as real measurements.
    const nextHopProtocol = last.nextHopProtocol || null;
    const taoAllowed = Boolean(nextHopProtocol);
    return {
      nextHopProtocol,
      transferSize:
        taoAllowed && Number.isFinite(last.transferSize) ? last.transferSize : null,
      durationMs: Number.isFinite(last.duration) ? last.duration : fallbackDurationMs,
      timingEntryPresent: true,
      encodedBodySize:
        taoAllowed && Number.isFinite(last.encodedBodySize) ? last.encodedBodySize : null,
      decodedBodySize:
        taoAllowed && Number.isFinite(last.decodedBodySize) ? last.decodedBodySize : null,
    };
  } catch {
    return emptyDiagnostics(null, false);
  }
}

function abortSignalWithTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function isTimeoutError(e: unknown): boolean {
  const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
  return name === "TimeoutError" || name === "AbortError";
}

async function probeSameOrigin(): Promise<ProbeResult> {
  try {
    const res = await fetch("/api/health", {
      cache: "no-store",
      signal: abortSignalWithTimeout(5000),
    });
    return res.ok ? "ok" : "failed";
  } catch (e) {
    return isTimeoutError(e) ? "timeout" : "failed";
  }
}

async function probePatchHost(patchUrl: string): Promise<ProbeResult> {
  let origin: string;
  try {
    origin = new URL(patchUrl).origin;
  } catch {
    return "skipped";
  }
  try {
    await fetch(`${origin}/`, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: abortSignalWithTimeout(5000),
    });
    return "ok";
  } catch (e) {
    return isTimeoutError(e) ? "timeout" : "failed";
  }
}

export async function runConnectivityProbes(
  patchUrl: string,
): Promise<{ probeSameOrigin: ProbeResult; probePatchHost: ProbeResult }> {
  try {
    const [sameOrigin, patchHost] = await Promise.all([
      probeSameOrigin(),
      probePatchHost(patchUrl),
    ]);
    return { probeSameOrigin: sameOrigin, probePatchHost: patchHost };
  } catch {
    return { probeSameOrigin: "skipped", probePatchHost: "skipped" };
  }
}

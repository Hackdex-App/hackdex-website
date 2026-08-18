export type ProbeResult = "ok" | "failed" | "timeout" | "skipped";

export class HTTPError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = "HTTPError";
    this.status = status;
  }
}

export function collectFetchDiagnostics(
  url: string,
  fallbackDurationMs: number,
): {
  nextHopProtocol: string | null;
  transferSize: number | null;
  durationMs: number | null;
  timingEntryPresent: boolean;
} {
  try {
    if (typeof performance === "undefined" || typeof performance.getEntriesByName !== "function") {
      return {
        nextHopProtocol: null,
        transferSize: null,
        durationMs: fallbackDurationMs,
        timingEntryPresent: false,
      };
    }

    const entries = performance.getEntriesByName(url);
    const last = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
    if (!last) {
      return {
        nextHopProtocol: null,
        transferSize: null,
        durationMs: fallbackDurationMs,
        timingEntryPresent: false,
      };
    }

    const nextHopProtocol = last.nextHopProtocol || null;
    return {
      nextHopProtocol,
      transferSize:
        nextHopProtocol && Number.isFinite(last.transferSize) ? last.transferSize : null,
      durationMs: Number.isFinite(last.duration) ? last.duration : fallbackDurationMs,
      timingEntryPresent: true,
    };
  } catch {
    return {
      nextHopProtocol: null,
      transferSize: null,
      durationMs: null,
      timingEntryPresent: false,
    };
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

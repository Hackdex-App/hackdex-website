import {
  collectResponseMetadata,
  HTTPError,
  type FetchFailurePhase,
  type ResponseMetadata,
} from "@/utils/patches/download-telemetry";

const MAX_ATTEMPTS = 5;

type DownloadDetails = {
  responseMetadata: ResponseMetadata;
  failurePhase: FetchFailurePhase;
  resumeCount: number;
  receivedBytes: number;
  url: string;
};

export type DownloadPatchResult = DownloadDetails & {
  blob: Blob;
};

export class DownloadPatchError extends Error implements DownloadDetails {
  readonly responseMetadata: ResponseMetadata;
  readonly failurePhase: FetchFailurePhase;
  readonly resumeCount: number;
  readonly receivedBytes: number;
  readonly url: string;

  constructor(error: unknown, details: DownloadDetails) {
    const message = error instanceof Error ? error.message : "Failed to fetch patch";
    super(message, { cause: error });
    this.name = error instanceof Error ? error.name : "DownloadPatchError";
    this.responseMetadata = details.responseMetadata;
    this.failurePhase = details.failurePhase;
    this.resumeCount = details.resumeCount;
    this.receivedBytes = details.receivedBytes;
    this.url = details.url;
  }
}

export type DownloadPatchOptions = {
  url: string;
  getNewSignedUrl: () => Promise<string>;
};

const EMPTY_RESPONSE_METADATA: ResponseMetadata = {
  responseStatus: null,
  contentLength: null,
  contentEncoding: null,
  contentType: null,
};

function parseContentRange(value: string | null): { start: number; total: number } | null {
  if (value == null) return null;
  const match = /^bytes (\d+)-\d+\/(\d+)$/.exec(value.trim());
  if (!match) return null;

  const start = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(total)) return null;
  return { start, total };
}

export async function downloadPatch({
  url: initialUrl,
  getNewSignedUrl,
}: DownloadPatchOptions): Promise<DownloadPatchResult> {
  let url = initialUrl;
  let chunks: BlobPart[] = [];
  let receivedBytes = 0;
  let expectedLength: number | null = null;
  let canResume = false;
  let shouldResume = false;
  let resumeCount = 0;
  let responseMetadata = EMPTY_RESPONSE_METADATA;
  let failurePhase: FetchFailurePhase = "request";
  let lastError: unknown = new Error("Failed to fetch patch");

  const fail = (error: unknown): DownloadPatchError =>
    new DownloadPatchError(error, {
      responseMetadata,
      failurePhase,
      resumeCount,
      receivedBytes,
      url,
    });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const rangeStart = shouldResume ? receivedBytes : null;
    if (rangeStart != null) resumeCount += 1;

    let response: Response;
    failurePhase = "request";
    try {
      response = await fetch(url, rangeStart == null
        ? undefined
        : { headers: { Range: `bytes=${rangeStart}-` } });
    } catch (error) {
      lastError = error;
      chunks = [];
      receivedBytes = 0;
      expectedLength = null;
      canResume = false;
      shouldResume = false;
      continue;
    }

    failurePhase = "response";
    responseMetadata = collectResponseMetadata(response);

    if (response.status === 403) {
      chunks = [];
      receivedBytes = 0;
      expectedLength = null;
      canResume = false;
      shouldResume = false;
      try {
        failurePhase = "request";
        url = await getNewSignedUrl();
      } catch (error) {
        throw fail(error);
      }
      continue;
    }

    if (!response.ok) {
      throw fail(new HTTPError(response.status));
    }

    if (rangeStart != null && response.status === 206) {
      const contentRange = parseContentRange(response.headers.get("content-range"));
      if (
        contentRange == null
        || contentRange.start !== rangeStart
        || contentRange.total !== expectedLength
      ) {
        chunks = [];
        receivedBytes = 0;
        expectedLength = null;
        canResume = false;
        shouldResume = false;
        lastError = new Error("Invalid Content-Range");
        continue;
      }
    } else if (rangeStart != null && response.status === 200) {
      chunks = [];
      receivedBytes = 0;
      expectedLength = responseMetadata.contentLength;
      canResume = expectedLength != null && responseMetadata.contentEncoding == null;
      shouldResume = false;
    } else if (rangeStart == null) {
      expectedLength = responseMetadata.contentLength;
      canResume = expectedLength != null && responseMetadata.contentEncoding == null;
    } else {
      throw fail(new HTTPError(response.status));
    }

    const bytesBeforeAttempt = receivedBytes;
    let bodyFailed = false;
    failurePhase = "body";

    if (!response.body) {
      try {
        const blob = await response.blob();
        chunks.push(blob);
        receivedBytes += blob.size;
      } catch (error) {
        throw fail(error);
      }
    } else {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(new Uint8Array(value));
          receivedBytes += value.byteLength;
        }
      } catch (error) {
        bodyFailed = true;
        lastError = error;
        if (expectedLength != null && receivedBytes === expectedLength) {
          return {
            blob: new Blob(chunks),
            responseMetadata,
            failurePhase,
            resumeCount,
            receivedBytes,
            url,
          };
        }
      }
    }

    if (!bodyFailed && (expectedLength == null || receivedBytes === expectedLength)) {
      return {
        blob: new Blob(chunks),
        responseMetadata,
        failurePhase,
        resumeCount,
        receivedBytes,
        url,
      };
    }

    if (receivedBytes === bytesBeforeAttempt) {
      throw fail(lastError);
    }

    if (
      canResume
      && expectedLength != null
      && receivedBytes > 0
      && receivedBytes < expectedLength
    ) {
      shouldResume = true;
      continue;
    }

    throw fail(lastError);
  }

  throw fail(lastError);
}

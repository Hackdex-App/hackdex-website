export interface XdeltaResult {
  ok: boolean;
  hasChecksums: boolean | null;
  errorCode?: number;
  errorMessage?: string;
}

type WorkerChunkMessage = { type: "chunk"; bytes: Uint8Array };
type WorkerProgressMessage = { type: "progress"; bytesOut: number; bytesIn: number };
type WorkerDoneMessage = {
  type: "done";
  ok: boolean;
  hasChecksums: boolean | null;
  errorCode?: number;
  errorMessage?: string;
};
type WorkerMessage = WorkerChunkMessage | WorkerProgressMessage | WorkerDoneMessage;

function isWorkerMessage(data: unknown): data is WorkerMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    (data.type === "chunk" || data.type === "progress" || data.type === "done")
  );
}

export function friendlyXdeltaError(result: XdeltaResult): string {
  const msg = result.errorMessage ?? "";
  if (msg.toLowerCase().includes("checksum")) {
    return "This patch does not match the selected base ROM.";
  }
  return msg || "xdelta patch failed";
}

export async function runXdelta(opts: {
  mode: "decode" | "encode";
  sourceFile: Blob;
  inputFile: Blob;
  disableChecksum?: boolean;
  discardOutput?: boolean;
  onChunk?: (bytes: Uint8Array) => void | Promise<void>;
  onProgress?: (p: { bytesOut: number; bytesIn: number }) => void;
}): Promise<XdeltaResult> {
  const worker = new Worker("/xdelta/xdelta3.worker.js", { type: "module" });

  return new Promise<XdeltaResult>((resolve, reject) => {
    let settled = false;
    let chunkQueue: Promise<void> = Promise.resolve();

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      settle();
    };

    worker.onmessage = (event: MessageEvent) => {
      if (!isWorkerMessage(event.data)) {
        finish(() => reject(new Error("Unexpected xdelta worker message")));
        return;
      }

      const data = event.data;

      if (data.type === "chunk") {
        const bytes = data.bytes;
        chunkQueue = chunkQueue.then(async () => {
          if (opts.onChunk) await opts.onChunk(bytes);
        });
        return;
      }

      if (data.type === "progress") {
        opts.onProgress?.({ bytesOut: data.bytesOut, bytesIn: data.bytesIn });
        return;
      }

      // type === "done"
      const result: XdeltaResult = {
        ok: data.ok,
        hasChecksums: data.hasChecksums ?? null,
        ...(data.errorCode !== undefined ? { errorCode: data.errorCode } : {}),
        ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      };

      void chunkQueue
        .then(() => {
          finish(() => resolve(result));
        })
        .catch((err: unknown) => {
          finish(() => reject(err));
        });
    };

    worker.onerror = (event) => {
      finish(() =>
        reject(event.error instanceof Error ? event.error : new Error(event.message || "xdelta worker error")),
      );
    };

    worker.postMessage({
      command: "start",
      mode: opts.mode,
      sourceFile: opts.sourceFile,
      inputFile: opts.inputFile,
      disableChecksum: opts.disableChecksum ?? false,
      discardOutput: opts.discardOutput ?? false,
    });
  });
}

export async function decodeXdelta(opts: {
  sourceFile: Blob;
  patchBlob: Blob;
  onChunk: (bytes: Uint8Array) => void | Promise<void>;
  onProgress?: (p: { bytesOut: number; bytesIn: number }) => void;
}): Promise<XdeltaResult> {
  return runXdelta({
    mode: "decode",
    sourceFile: opts.sourceFile,
    inputFile: opts.patchBlob,
    onChunk: opts.onChunk,
    onProgress: opts.onProgress,
  });
}

export async function encodeXdelta(opts: {
  sourceFile: Blob;
  targetFile: Blob;
}): Promise<{ result: XdeltaResult; patch: Blob | null }> {
  const chunks: BlobPart[] = [];
  const result = await runXdelta({
    mode: "encode",
    sourceFile: opts.sourceFile,
    inputFile: opts.targetFile,
    onChunk: (bytes) => {
      chunks.push(
        bytes.buffer instanceof ArrayBuffer
          ? (bytes as Uint8Array<ArrayBuffer>)
          : new Uint8Array(bytes),
      );
    },
  });
  return {
    result,
    patch: result.ok ? new Blob(chunks) : null,
  };
}

export async function trialDecodeXdelta(opts: {
  sourceFile: Blob;
  patchBlob: Blob;
}): Promise<XdeltaResult> {
  return runXdelta({
    mode: "decode",
    sourceFile: opts.sourceFile,
    inputFile: opts.patchBlob,
    discardOutput: true,
    disableChecksum: false,
  });
}

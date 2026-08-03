export class SaveCancelledError extends Error {
  constructor(message = "Save cancelled") {
    super(message);
    this.name = "SaveCancelledError";
  }
}

export type OutputSink = {
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
  streaming: boolean;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  // Defer cleanup so the browser can start the download before the URL is revoked.
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    a.remove();
  }, 1000);
}

/** Normalize worker-transferred views for BlobPart / BufferSource (TS 5.9 ArrayBuffer typing). */
function asArrayBufferView(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return bytes.buffer instanceof ArrayBuffer
    ? (bytes as Uint8Array<ArrayBuffer>)
    : new Uint8Array(bytes);
}

function createBlobSink(fileName: string): OutputSink {
  const chunks: BlobPart[] = [];
  return {
    streaming: false,
    async write(bytes) {
      chunks.push(asArrayBufferView(bytes));
    },
    async close() {
      triggerBlobDownload(new Blob(chunks), fileName);
    },
    async abort() {
      chunks.length = 0;
    },
  };
}

async function tryCreateStreamingSink(fileName: string): Promise<OutputSink | null> {
  if (typeof window.showSaveFilePicker !== "function") {
    return null;
  }

  try {
    const handle = await window.showSaveFilePicker({ suggestedName: fileName });
    const writable = await handle.createWritable();
    return {
      streaming: true,
      async write(bytes) {
        await writable.write(asArrayBufferView(bytes));
      },
      async close() {
        await writable.close();
      },
      async abort() {
        await writable.abort();
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw new SaveCancelledError();
    }
    // No user activation, unsupported, or other picker/writable failure → Blob sink.
    return null;
  }
}

export async function createOutputSink(fileName: string): Promise<OutputSink> {
  const streaming = await tryCreateStreamingSink(fileName);
  if (streaming) return streaming;
  return createBlobSink(fileName);
}

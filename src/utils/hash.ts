import { sha1 } from "js-sha1";

async function subtleSha1Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export async function sha1Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();

  if (typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function") {
    try {
      return await subtleSha1Hex(buf);
    } catch {
      // crypto.subtle can fail outside a secure context (e.g. http dev)
    }
  }

  return sha1(buf);
}

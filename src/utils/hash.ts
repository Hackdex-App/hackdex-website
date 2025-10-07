export async function sha1Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  // @ts-ignore - subtle may be undefined in non-browser
  const digest = await (crypto.subtle as SubtleCrypto).digest("SHA-1", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}



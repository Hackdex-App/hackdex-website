import sharp from "sharp";
import { MAX_IMAGE_UPLOAD_BYTES } from "../data/hackLimits.ts";

type CoverFormat = "png" | "jpeg" | "gif";

function rasterFormat(bytes: Buffer): CoverFormat | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "gif";
  return null;
}

/** Decode and re-encode before anything reaches the public screenshots bucket. */
export async function reencodeCoverImage(bytes: Buffer) {
  const format = rasterFormat(bytes);
  if (!format || !bytes.length || bytes.length > MAX_IMAGE_UPLOAD_BYTES) return null;

  try {
    const image = sharp(bytes, { animated: format === "gif", limitInputPixels: 20_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 120) return null;

    const output = format === "png"
      ? await image.png().toBuffer()
      : format === "jpeg"
        ? await image.jpeg().toBuffer()
        : await image.gif().toBuffer();
    if (output.length > MAX_IMAGE_UPLOAD_BYTES) return null;

    return {
      bytes: output,
      extension: format === "jpeg" ? "jpg" : format,
      contentType: format === "jpeg" ? "image/jpeg" : `image/${format}`,
    };
  } catch {
    return null;
  }
}

/** Avatars use the first frame, a centred square crop, and a fresh PNG. */
export async function reencodeAvatarImage(bytes: Buffer) {
  const format = rasterFormat(bytes);
  if (!format || !bytes.length || bytes.length > MAX_IMAGE_UPLOAD_BYTES) return null;

  try {
    const image = sharp(bytes, { limitInputPixels: 20_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height) return null;
    const side = Math.min(metadata.width, metadata.height);
    const output = await image
      .extract({ left: Math.floor((metadata.width - side) / 2), top: Math.floor((metadata.height - side) / 2), width: side, height: side })
      .resize(Math.min(side, 240), Math.min(side, 240))
      .png()
      .toBuffer();
    return output.length <= 1024 * 1024 ? output : null;
  } catch {
    return null;
  }
}

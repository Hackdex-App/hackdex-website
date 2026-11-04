import { MAX_IMAGE_UPLOAD_BYTES } from "@/data/hackLimits";

export async function uploadCover(slug: string, file: File): Promise<string> {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw new Error("Screenshot exceeds 4 MB");
  const response = await fetch(`/api/hack/cover?slug=${encodeURIComponent(slug)}`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Screenshot upload failed");
  return result.key;
}

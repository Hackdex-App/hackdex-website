import { randomBytes } from "node:crypto";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/data/hackLimits";
import { checkEditPermission } from "@/utils/hack";
import { reencodeCoverImage } from "@/utils/imageUpload";
import { COVERS_BUCKET, getMinioClient } from "@/utils/minio/server";
import { readUpload } from "@/utils/readUpload";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing hack" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: hack, error } = await supabase
    .from("hacks")
    .select("slug, created_by, current_patch, original_author, permission_from, is_archive")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !hack) return Response.json({ error: "Hack not found" }, { status: 404 });
  const permission = await checkEditPermission(hack, user.id, supabase);
  if (!permission.canEdit) return Response.json({ error: "Forbidden" }, { status: 403 });

  const length = Number(request.headers.get("content-length"));
  if (length > MAX_IMAGE_UPLOAD_BYTES) return Response.json({ error: "Screenshot exceeds 4 MB" }, { status: 413 });
  const input = await readUpload(request, MAX_IMAGE_UPLOAD_BYTES);
  if (!input) return Response.json({ error: "Screenshot exceeds 4 MB" }, { status: 413 });
  const image = await reencodeCoverImage(input);
  if (!image) return Response.json({ error: "Use a PNG, JPEG or GIF screenshot up to 4 MB" }, { status: 400 });

  const key = `${slug}/${randomBytes(12).toString("hex")}.${image.extension}`;
  try {
    await getMinioClient().putObject(COVERS_BUCKET, key, image.bytes, image.bytes.length, { "Content-Type": image.contentType });
  } catch {
    return Response.json({ error: "Screenshot upload failed" }, { status: 500 });
  }
  return Response.json({ key });
}

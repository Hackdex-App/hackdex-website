import { randomBytes } from "node:crypto";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/data/hackLimits";
import { reencodeAvatarImage } from "@/utils/imageUpload";
import { readUpload } from "@/utils/readUpload";
import { createClient, createServiceClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const length = Number(request.headers.get("content-length"));
  if (length > MAX_IMAGE_UPLOAD_BYTES) return Response.json({ error: "Avatar exceeds 4 MB" }, { status: 413 });
  const input = await readUpload(request, MAX_IMAGE_UPLOAD_BYTES);
  if (!input) return Response.json({ error: "Avatar exceeds 4 MB" }, { status: 413 });
  const image = await reencodeAvatarImage(input);
  if (!image) return Response.json({ error: "Use a PNG, JPEG or GIF avatar up to 4 MB" }, { status: 400 });

  const path = `${user.id}-${randomBytes(12).toString("hex")}.png`;
  const service = await createServiceClient();
  const { error } = await service.storage.from("avatars").upload(path, image, { contentType: "image/png", upsert: false });
  if (error) return Response.json({ error: "Avatar upload failed" }, { status: 500 });
  return Response.json({ path });
}

import { NextRequest } from "next/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patch, error } = await supabase
    .from("patches")
    .select("id, bucket, filename")
    .eq("id", Number(id))
    .maybeSingle();
  if (error || !patch) {
    return new Response("Not found", { status: 404 });
  }

  // Log download attempt (fire-and-forget)
  try {
    await supabase.from("patch_downloads").insert({ patch: patch.id });
  } catch {}

  const client = getMinioClient();
  const bucket = patch.bucket || PATCHES_BUCKET;
  const url = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
  return Response.redirect(url, 302);
}



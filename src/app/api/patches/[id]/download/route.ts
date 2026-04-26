import { NextRequest } from "next/server";
import { getMinioClient, PATCHES_BUCKET } from "@/utils/minio/server";
import { buildPatchDownloadUrl } from "@/utils/patches/patch-download-url";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Log suspicious access patterns
  const referer = req.headers.get("referer");
  const userAgent = req.headers.get("user-agent");
  const ip = req.headers.get("x-forwarded-for") ||
             req.headers.get("x-real-ip") ||
             "unknown";

  // Check for suspicious patterns
  const suspiciousPatterns = {
    noReferer: !referer,
    suspiciousUserAgent: userAgent && (
      userAgent.includes("bot") ||
      userAgent.includes("crawler") ||
      userAgent.includes("spider") ||
      userAgent.includes("scraper") ||
      !userAgent.includes("Mozilla")
    ),
  };

  if (suspiciousPatterns.noReferer || suspiciousPatterns.suspiciousUserAgent) {
    console.warn("[BOT_DETECTION] Suspicious access to patch download:", {
      patchId: id,
      ip,
      userAgent,
      referer,
      patterns: suspiciousPatterns,
      timestamp: new Date().toISOString(),
    });
  }

  const { data: patch, error } = await supabase
    .from("patches")
    .select("id, bucket, filename")
    .eq("id", Number(id))
    .maybeSingle();
  if (error || !patch) {
    return new Response("Not found", { status: 404 });
  }

  const workerUrl = buildPatchDownloadUrl(patch.filename);
  if (workerUrl) {
    return Response.redirect(workerUrl, 302);
  }

  const client = getMinioClient();
  const bucket = patch.bucket || PATCHES_BUCKET;
  const url = await client.presignedGetObject(bucket, patch.filename, 60 * 5);
  return Response.redirect(url, 302);
}



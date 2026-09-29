import { NextRequest } from "next/server";
import { getPatchDownloadUrl } from "@/app/hack/[slug]/actions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  // Same rules as the patcher: published, not archived, the hack's download
  // permission, and the parent hack visible to this caller (drafts and pending
  // hacks aren't). Anything else looks like a missing patch.
  const patchId = Number(id);
  const res = Number.isInteger(patchId) ? await getPatchDownloadUrl(patchId) : null;
  if (!res?.ok) return new Response("Not found", { status: 404 });
  return Response.redirect(res.url, 302);
}

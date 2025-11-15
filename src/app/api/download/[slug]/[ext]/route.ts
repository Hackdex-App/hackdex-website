import { NextRequest } from "next/server";

// Honeypot endpoint - logs bot access attempts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; ext: string }> }
) {
  const { slug, ext } = await params;

  // Get request information for logging
  const ip = req.headers.get("x-forwarded-for") ||
             req.headers.get("x-real-ip") ||
             "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";
  const timestamp = new Date().toISOString();

  // Log bot access attempt (in production, you might want to send this to a logging service)
  console.warn("[HONEYPOT] Bot access detected:", {
    slug,
    ext,
    ip,
    userAgent,
    referer,
    timestamp,
    path: `/api/download/${slug}/${ext}`,
  });

  // Return 404 to make it look like the file doesn't exist
  return new Response("Not found", { status: 404 });
}


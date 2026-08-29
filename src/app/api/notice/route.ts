import { get } from "@vercel/edge-config";

const NOTICE_KEY =
  process.env.NEXT_PUBLIC_NOTICE_KEY ?? "global_notice_message";

export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  let message: string | null = null;

  try {
    const value = await get<string | null>(NOTICE_KEY);
    if (typeof value === "string" && value.trim().length > 0) {
      message = value.trim();
    }
  } catch {
    // Fail silently if Edge Config is unavailable or misconfigured.
  }

  return Response.json(
    { message },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate",
      },
    },
  );
}

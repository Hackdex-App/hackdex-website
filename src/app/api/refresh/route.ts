import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { checkUserRoles } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";
import { revalidateDiscoverCatalog } from "@/app/discover/revalidate";

/**
 * Admin-only: drops the cached data and rendered pages for every hack, plus
 * the discover catalog. Use after a Supabase outage left bad pages cached.
 * For a single hack, use /api/refresh/[slug].
 */
export async function GET(req: NextRequest) {
  const supa = await createClient();
  const { data: user } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { isAdmin } = await checkUserRoles(supa);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Every hack cache entry (metadata, downloads, redirect) carries the "hack" tag.
  revalidateTag("hack");
  revalidatePath("/hack/[slug]", "layout");
  revalidateDiscoverCatalog();
  return NextResponse.redirect(new URL("/discover", req.url));
}

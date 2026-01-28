import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { checkUserRoles } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";

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

  revalidateTag("discover");
  return NextResponse.redirect(new URL("/discover", req.url));
}

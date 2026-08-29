import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { checkUserRoles } from "@/utils/user";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supa = await createClient();
  const { data: user } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { isAdmin } = await checkUserRoles(supa);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  revalidateTag(`hack:${slug}:metadata`);
  revalidateTag(`hack:${slug}:downloads`);
  revalidatePath(`/hack/${slug}`);
  return NextResponse.redirect(new URL(`/hack/${slug}`, req.url));
}
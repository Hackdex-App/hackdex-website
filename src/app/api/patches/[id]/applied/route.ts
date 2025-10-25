import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { deviceId } = await req.json().catch(() => ({ deviceId: undefined }));
  if (!deviceId || typeof deviceId !== "string") {
    return new Response("Missing deviceId", { status: 400 });
  }

  const supabase = await createClient();
  const patchId = Number(id);
  if (!Number.isFinite(patchId)) {
    return new Response("Bad id", { status: 400 });
  }

  // Try insert; if unique constraint violation, treat as success (already counted)
  const { error } = await supabase
    .from("patch_downloads")
    .insert({ patch: patchId, device_id: deviceId });

  if (error) {
    // PostgREST unique violation codes commonly surface as 409 or PGRST specific; best-effort accept duplicates
    if ((error as any).code === "23505" || /duplicate|unique/i.test(error.message)) {
      return new Response(null, { status: 200 });
    }
    return new Response(error.message || "Failed", { status: 500 });
  }

  return new Response(null, { status: 201 });
}

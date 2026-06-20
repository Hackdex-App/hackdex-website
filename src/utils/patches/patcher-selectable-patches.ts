import type { Database } from "@/types/db";
import type { PatcherPatchSelection, SelectablePatch } from "@/types/patcher";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPatcherSelectablePatches(
  supabase: SupabaseClient<Database>,
  slug: string,
  currentPatchId: number | null,
): Promise<PatcherPatchSelection> {
  const { data: rows, error } = await supabase
    .from("hack_patcher_patches")
    .select("patch_id, sort_order, patches!inner(id, version, created_at, published, archived)")
    .eq("hack_slug", slug)
    .eq("patches.published", true)
    .eq("patches.archived", false)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error(error);
    return {
      savedPatchIds: [],
      selectablePatches: [],
      defaultPatchId: null,
    };
  }
  const savedPatchIds = rows.map((row) => row.patch_id);
  let selectablePatches: SelectablePatch[] = rows.map((row) => row.patches).flat().map((patch) => ({
    id: patch.id,
    version: patch.version,
    created_at: patch.created_at,
  }));
  if (selectablePatches.length === 0 && currentPatchId !== null) {
    const { data: currentPatch, error: currentPatchError } = await supabase
      .from("patches")
      .select("id, version, created_at, published, archived")
      .eq("id", currentPatchId)
      .maybeSingle();
    if (currentPatchError) {
      console.error(currentPatchError);
      return {
        savedPatchIds: [],
        selectablePatches: [],
        defaultPatchId: null,
      };
    }
    if (currentPatch?.published && !currentPatch?.archived) {
      selectablePatches = [currentPatch];
    }
  }
  const defaultPatchId = (currentPatchId !== null && selectablePatches.some((patch) => patch.id === currentPatchId))
    ? currentPatchId
    : selectablePatches[0]?.id ?? null;

  return {
    savedPatchIds,
    selectablePatches,
    defaultPatchId,
  };
}

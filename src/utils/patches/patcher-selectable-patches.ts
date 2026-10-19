import type { Database } from "@/types/db";
import type { PatcherPatchSelection, SelectablePatch } from "@/types/patcher";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Patches the patcher offers for a hack, plus the default pick. Throws on
 * Supabase errors so callers never mistake an outage for "no patches".
 */
export async function getPatcherSelectablePatches(
  supabase: SupabaseClient<Database>,
  slug: string,
  currentPatchId: number | null,
): Promise<PatcherPatchSelection> {
  const { data: rows, error } = await supabase
    .from("hack_patcher_patches")
    .select("patch_id, sort_order, patches!inner(id, version, created_at, published, archived, filename)")
    .eq("hack_slug", slug)
    .eq("patches.published", true)
    .eq("patches.archived", false)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const savedPatchIds = rows.map((row) => row.patch_id);
  let selectablePatches: SelectablePatch[] = rows.map((row) => row.patches).flat().map((patch) => ({
    id: patch.id,
    version: patch.version,
    created_at: patch.created_at,
    filename: patch.filename,
  }));
  const hasSavedRows = selectablePatches.length > 0;
  if (selectablePatches.length === 0 && currentPatchId !== null) {
    const { data: currentPatch, error: currentPatchError } = await supabase
      .from("patches")
      .select("id, version, created_at, published, archived, filename")
      .eq("id", currentPatchId)
      .maybeSingle();
    if (currentPatchError) throw currentPatchError;
    if (currentPatch?.published && !currentPatch?.archived) {
      selectablePatches = [currentPatch];
    }
  }
  const defaultPatchId = hasSavedRows
    ? selectablePatches[0]?.id ?? null
    : (currentPatchId !== null && selectablePatches.some((patch) => patch.id === currentPatchId))
      ? currentPatchId
      : selectablePatches[0]?.id ?? null;

  return {
    savedPatchIds,
    selectablePatches,
    defaultPatchId,
  };
}

import type { Database } from "@/types/db";
import type { PatcherPatchSelection, SelectablePatch } from "@/types/patcher";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMultiEntryHack } from "@/utils/hacks/multi-entry";

function toSelectablePatch(patch: {
  id: number;
  version: string;
  created_at: string;
  filename: string | null;
  label?: string | null;
  info?: string | null;
  base_rom?: string | null;
}): SelectablePatch {
  return {
    id: patch.id,
    version: patch.version,
    created_at: patch.created_at,
    filename: patch.filename,
    label: patch.label ?? null,
    info: patch.info ?? null,
    base_rom: patch.base_rom ?? null,
  };
}

export async function hackDisablesCustomPatcher(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<boolean> {
  const [{ count: baseRomCount }, { data: patches }] = await Promise.all([
    supabase
      .from("hack_base_roms")
      .select("base_rom", { count: "exact", head: true })
      .eq("hack_slug", slug),
    supabase
      .from("patches")
      .select("version,label,archived")
      .eq("parent_hack", slug),
  ]);
  return isMultiEntryHack({
    baseRomCount: baseRomCount ?? 0,
    patches: patches || [],
  });
}

export async function getPatcherSelectablePatches(
  supabase: SupabaseClient<Database>,
  slug: string,
  currentPatchId: number | null,
): Promise<PatcherPatchSelection> {
  const customPatcherDisabled = await hackDisablesCustomPatcher(supabase, slug);
  let savedPatchIds: number[] = [];
  let selectablePatches: SelectablePatch[] = [];
  if (!customPatcherDisabled) {
    const { data: rows, error } = await supabase
      .from("hack_patcher_patches")
      .select("patch_id, sort_order, patches!inner(id, version, created_at, published, archived, filename, label, info, base_rom)")
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
    savedPatchIds = rows.map((row) => row.patch_id);
    selectablePatches = rows.map((row) => row.patches).flat().map(toSelectablePatch);
  }
  const hasSavedRows = selectablePatches.length > 0;
  if (selectablePatches.length === 0 && currentPatchId !== null) {
    const { data: currentPatch, error: currentPatchError } = await supabase
      .from("patches")
      .select("id, version, created_at, published, archived, filename, label, info, base_rom")
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
      const { data: siblings, error: siblingError } = await supabase
        .from("patches")
        .select("id, version, created_at, published, archived, filename, label, info, base_rom")
        .eq("parent_hack", slug)
        .eq("version", currentPatch.version)
        .eq("published", true)
        .eq("archived", false)
        .order("id", { ascending: true });
      if (siblingError) {
        console.error(siblingError);
        selectablePatches = [toSelectablePatch(currentPatch)];
      } else {
        selectablePatches = (siblings && siblings.length > 0 ? siblings : [currentPatch]).map(toSelectablePatch);
      }
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

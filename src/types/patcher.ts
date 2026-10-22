export interface SelectablePatch {
  id: number;
  version: string;
  created_at: string;
  filename: string | null;
  label: string | null;
  info: string | null;
  base_rom: string | null;
};

export interface PatcherPatchSelection {
  savedPatchIds: number[];
  selectablePatches: SelectablePatch[];
  defaultPatchId: number | null;
};

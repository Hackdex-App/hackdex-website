export interface SelectablePatch {
  id: number;
  version: string;
  created_at: string;
  filename: string | null;
};

export interface PatcherPatchSelection {
  savedPatchIds: number[];
  selectablePatches: SelectablePatch[];
  defaultPatchId: number | null;
};

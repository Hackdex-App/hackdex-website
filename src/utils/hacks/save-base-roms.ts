import type { Database } from "@/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uniqueBaseRomIds } from "@/utils/hacks/base-roms";
import { baseRoms } from "@/data/baseRoms";

export function parseBaseRomIds(value: FormDataEntryValue | string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return uniqueBaseRomIds(value);
  if (typeof value !== "string") return [];
  return uniqueBaseRomIds(value.split(","));
}

export function validateKnownBaseRomIds(ids: string[]): string | null {
  const known = new Set(baseRoms.map((rom) => rom.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length > 0) return "One or more selected base ROMs are not supported.";
  const platforms = new Set(ids.map((id) => baseRoms.find((rom) => rom.id === id)?.platform).filter(Boolean));
  if (platforms.size > 1) return "All base ROMs must be for the same platform.";
  return null;
}

export async function replaceHackBaseRoms(
  supabase: SupabaseClient<Database>,
  slug: string,
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const unique = uniqueBaseRomIds(ids);
  const invalid = validateKnownBaseRomIds(unique);
  if (invalid) return { ok: false, error: invalid };
  if (unique.length === 0) return { ok: false, error: "At least one base ROM is required." };

  const { error: deleteErr } = await supabase.from("hack_base_roms").delete().eq("hack_slug", slug);
  if (deleteErr) return { ok: false, error: deleteErr.message };

  const { error: insertErr } = await supabase.from("hack_base_roms").insert(
    unique.map((base_rom, sort_order) => ({ hack_slug: slug, base_rom, sort_order })),
  );
  if (insertErr) return { ok: false, error: insertErr.message };
  return { ok: true };
}

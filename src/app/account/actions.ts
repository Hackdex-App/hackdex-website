"use server";

import { createClient } from "@/utils/supabase/server";

export type UpdateState =
  | { ok: true; error: null }
  | { ok: false; error: string }
  | null;

export async function updatePassword(state: UpdateState, payload: FormData): Promise<UpdateState> {
  const password = (payload.get("newPassword") as string | null) || "";
  const supabase = await createClient();

  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." } as const;
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, error: error.message || "Unable to update password." } as const;
  }

  return { ok: true, error: null } as const;
}

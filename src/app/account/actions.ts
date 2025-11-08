"use server";

import { sendDiscordMessageEmbed } from "@/utils/discord";
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

export async function setupProfile(username: string): Promise<UpdateState> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be logged in to set up your profile." } as const;
  }

  if (!username || username.length < 3 || username.length > 20) {
    return { ok: false, error: "Username must be between 3 and 20 characters." } as const;
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    username,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message || "There was an error saving. Please try again." } as const;
  }

  if (process.env.DISCORD_WEBHOOK_ADMIN_URL) {
    await sendDiscordMessageEmbed(process.env.DISCORD_WEBHOOK_ADMIN_URL, [
      {
        title: 'New Profile Setup',
        description: `A new user (\`${user.id}\`) has setup their profile with the username: \`@${username}\``,
        color: 0x40f56a,
        footer: {
          text: 'This message brought to you by Hackdex'
        }
      },
    ]);
  }
  return { ok: true, error: null } as const;
}

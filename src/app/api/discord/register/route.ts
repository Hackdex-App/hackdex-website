import { NextResponse } from "next/server";
import {
  DiscordEnvironmentError,
  registerDiscordGuildCommands,
} from "@/utils/discord-rest";
import { createClient } from "@/utils/supabase/server";
import { checkUserRoles } from "@/utils/user";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { isAdmin } = await checkUserRoles(supa);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const registered = await registerDiscordGuildCommands();
    return NextResponse.json({
      count: registered.length,
      names: registered.map((command) => command.name),
    });
  } catch (error) {
    if (error instanceof DiscordEnvironmentError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const message = error instanceof Error
      ? error.message
      : "Discord command registration failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

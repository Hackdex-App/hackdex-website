import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/Dashboard/DashboardClient";
import { getDownloadsSeriesAll } from "./actions";

export default async function DashboardPage() {
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) redirect("/login");


  const { data: profile } = await supa
    .from("profiles")
    .select("username,full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.username == null) {
    redirect("/account");
  }

  const { username, full_name } = profile;

  const { data: hacks } = await supa
    .from("hacks")
    .select("slug,title,approved,updated_at,downloads,current_patch,version,created_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  const seriesAll = await getDownloadsSeriesAll({ days: 30 });

  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8">
      <DashboardClient
        hacks={hacks ?? []}
        initialSeriesAll={seriesAll}
        displayName={full_name || `@${username}`}
      />
    </div>
  );
}



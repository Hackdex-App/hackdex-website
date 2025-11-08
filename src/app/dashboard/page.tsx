import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FiExternalLink } from "react-icons/fi";
import DashboardClient from "@/components/Dashboard/DashboardClient";
import { getDownloadsSeriesAll } from "./actions";
import type { HackRow } from "@/components/Dashboard/DashboardClient";

export default async function DashboardPage() {
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) redirect("/login");

  const { data: isAdmin } = await supa.rpc("is_admin");
  let pendingHacks: (HackRow & { created_by: string; creator_username: string | null })[] = [];
  if (isAdmin) {
    const { data: pendingHacksData } = await supa
      .from("hacks")
      .select("slug,title,approved,updated_at,downloads,current_patch,version,created_at,created_by")
      .eq("approved", false)
      .order("created_at", { ascending: false });

    if (pendingHacksData && pendingHacksData.length > 0) {
      // Fetch creator usernames
      const creatorIds = [...new Set(pendingHacksData.map(h => h.created_by as string))];
      const { data: profiles } = await supa
        .from("profiles")
        .select("id,username")
        .in("id", creatorIds);

      const usernameById = new Map<string, string | null>();
      (profiles || []).forEach((p) => usernameById.set(p.id, p.username));

      pendingHacks = pendingHacksData.map((h) => ({
        ...h,
        creator_username: usernameById.get(h.created_by as string) || null,
      }));
    }
  }

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

      {pendingHacks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Pending hacks</h2>
          <div className="overflow-hidden rounded-lg border border-amber-600/30 bg-amber-500/5">
            {/* Header row (desktop only) */}
            <div className="hidden lg:grid grid-cols-12 bg-amber-500/5 px-4 py-2 text-xs text-amber-900/80 dark:text-amber-200/80">
              <div className="col-span-5">Title</div>
              <div className="col-span-3">Creator</div>
              <div className="col-span-4">Created</div>
            </div>
            <div className="divide-y divide-amber-600/20">
              {pendingHacks.map((h) => {
                console.log(h.created_at);
                const createdDate = h.created_at
                  ? new Date(h.created_at).toLocaleTimeString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown";
                const creator = h.creator_username ? `@${h.creator_username}` : "Unknown";

                return (
                  <Link
                    key={h.slug}
                    href={`/hack/${h.slug}`}
                    target="_blank"
                    className="group block px-4 py-3 text-sm bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                  >
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-12 items-center">
                      <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-start min-w-0">
                            <div className="truncate font-medium text-amber-900/90 dark:text-amber-200/90 group-hover:underline">{h.title}</div>
                            <div className="mt-0.5 text-xs text-amber-900/60 dark:text-amber-200/60 group-hover:underline">/{h.slug}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 text-amber-900/90 dark:text-amber-200/90">{creator}</div>
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="text-amber-900/90 dark:text-amber-200/90 flex-1">{createdDate}</div>
                          <FiExternalLink className="h-4 w-4 text-amber-900/90 dark:text-amber-200/90 flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    {/* Mobile card */}
                    <div className="lg:hidden flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <div className="font-medium break-words">{h.title}</div>
                          <div className="mt-0.5 text-xs text-foreground/60 break-all">/{h.slug}</div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-amber-900/90 dark:text-amber-200/90 mt-2">
                            <span>{creator}</span>
                            <span>•</span>
                            <span>{createdDate}</span>
                          </div>
                        </div>
                        <FiExternalLink className="h-4 w-4 text-foreground/80 flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



import { createClient, createServiceClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/Dashboard/DashboardClient";
import ArchiverManagement from "@/components/Dashboard/ArchiverManagement";
import { getDownloadsSeriesAll } from "./actions";
import type { PendingHack } from "@/components/Dashboard/PendingHacks";
import PendingHacks from "@/components/Dashboard/PendingHacks";

export default async function DashboardPage() {
  const supa = await createClient();
  const { data: userResp } = await supa.auth.getUser();
  const user = userResp.user;
  if (!user) redirect("/login");

  const { data: isAdmin } = await supa.rpc("is_admin");
  let pendingHacks: PendingHack[] = [];
  if (isAdmin) {
    const { data: pendingHacksData } = await supa
      .from("hacks")
      .select("slug,title,approved,updated_at,downloads,current_patch,version,created_at,created_by,assigned_admin")
      .eq("approved", false)
      .order("created_at", { ascending: false });

    if (pendingHacksData && pendingHacksData.length > 0) {
      // Fetch creator usernames
      const profileIds = [
        ...new Set(pendingHacksData.map(h => h.created_by as string)),
        ...new Set(pendingHacksData.map(h => h.assigned_admin).filter(a => a !== null) as string[]),
      ];
      const { data: profiles } = await supa
        .from("profiles")
        .select("id,username,full_name,verified")
        .in("id", profileIds);

      const usernameById = new Map<string, string | null>();
      const fullNameById = new Map<string, string | null>();
      const verifiedById = new Map<string, boolean>();
      (profiles || []).forEach((p) => {
        usernameById.set(p.id, p.username);
        fullNameById.set(p.id, p.full_name);
        verifiedById.set(p.id, p.verified);
      });

      // Fetch creator emails using service client (admin API)
      const serviceClient = await createServiceClient();
      const emailById = new Map<string, string | null>();
      for (const userId of profileIds) {
        try {
          const { data: userData, error } = await serviceClient.auth.admin.getUserById(userId);
          if (!error && userData?.user?.email) {
            emailById.set(userId, userData.user.email);
          }
        } catch (error) {
          // Silently fail if we can't get the email
          console.error(`Failed to get email for user ${userId}:`, error);
        }
      }

      pendingHacks = pendingHacksData.map((h) => ({
        ...h,
        creator_username: usernameById.get(h.created_by as string) || null,
        creator_full_name: fullNameById.get(h.created_by as string) || null,
        creator_email: emailById.get(h.created_by as string) || null,
        creator_verified: verifiedById.get(h.created_by as string) || false,
        assigned_admin_username: usernameById.get(h.assigned_admin as string) || null,
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

  // Check if user is admin or archiver for archives link
  const { data: isArchiver } = await supa.rpc("is_archiver");
  const canAccessArchives = isAdmin || isArchiver;

  const { data: hacks } = await supa
    .from("hacks")
    .select("slug,title,approved,updated_at,downloads,current_patch(id,version),created_at,original_author,is_archive")
    .is("is_archive", false)
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false });

  const hacksWithVersions = hacks?.map((h) => ({
    ...h,
    version: h.current_patch?.version || "Pre-release",
    current_patch: h.current_patch?.id || null,
  }));

  const seriesAll = await getDownloadsSeriesAll({ days: 30 });

  return (
    <div className="mx-auto my-auto max-w-screen-2xl px-6 py-8">
      <DashboardClient
        hacks={hacksWithVersions ?? []}
        initialSeriesAll={seriesAll}
        displayName={full_name || `@${username}`}
      />

      {isAdmin && <PendingHacks hacks={pendingHacks} userId={user.id} />}

      {isAdmin && <ArchiverManagement />}

      {canAccessArchives && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">Archive Management</h2>
            <Link
              href="/dashboard/archives"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            >
              View all archives
            </Link>
          </div>
          <p className="text-sm text-foreground/60">
            Archive hacks are informational entries preserved for historical reference. They do not include patch files.
          </p>
        </div>
      )}
    </div>
  );
}



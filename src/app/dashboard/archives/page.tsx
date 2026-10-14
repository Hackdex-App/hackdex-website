import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ArchivesList from "@/components/Dashboard/ArchivesList";
import { getArchives } from "./actions";

export default async function ArchivesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Check if user is admin or archiver
  const { data: isAdmin } = await supabase.rpc("is_admin");
  const { data: isArchiver } = await supabase.rpc("is_archiver");
  if (!isAdmin && !isArchiver) {
    redirect("/dashboard");
  }

  // Fetch initial page of archives
  const initialData = await getArchives({ page: 1, limit: 50 });

  return (
    <div className="mx-auto w-full max-w-[1164px] px-6 py-10">
      <div className="mb-6">
        <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px]">Archive Management</h1>
        <p className="mt-2 text-[15px] text-text-2">
          Manage all Archive hacks. Archive hacks are informational entries preserved for historical reference.
        </p>
      </div>
      <ArchivesList initialData={initialData.ok ? initialData : { ok: false, error: initialData.error || "Failed to load archives" }} isAdmin={isAdmin ?? false} />
    </div>
  );
}

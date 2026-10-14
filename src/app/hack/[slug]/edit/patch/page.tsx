import { redirect, notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import HackPatchForm from "@/components/Hack/HackPatchForm";
import Link from "next/link";
import { FaChevronLeft } from "react-icons/fa6";
import { isInformationalArchiveHack, isDownloadableArchiveHack, canEditAsCreator, canEditAsAdmin, canEditAsArchiver } from "@/utils/hack";
import { getPatcherSelectablePatches } from "@/utils/patches/patcher-selectable-patches";
import { AI_SELECT, aiDisclosureFromRow } from "@/utils/aiDisclosure";
import { getHackBaseRomIds } from "@/utils/hacks/save-base-roms";
import { isMultiEntryHack } from "@/utils/hacks/multi-entry";

interface EditPatchPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPatchPage({ params }: EditPatchPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/hack/${slug}`);
  }

  const { data: hack } = await supabase
    .from("hacks")
    .select(`slug,base_rom,created_by,title,current_patch,original_author,permission_from,is_archive,custom_version_name,${AI_SELECT}`)
    .eq("slug", slug)
    .maybeSingle();
  if (!hack) return notFound();
  
  // Check permissions: creator first (optimization), then admin, then archiver
  const isCreator = canEditAsCreator(hack, user!.id);
  if (!isCreator) {
    const isInformationalArchive = isInformationalArchiveHack(hack);
    const isDownloadableArchive = isDownloadableArchiveHack(hack);
    
    // Informational archives cannot have patches
    if (isInformationalArchive) redirect(`/hack/${slug}`);
    
    // Check admin (works for any hack)
    const isAdmin = await canEditAsAdmin(hack, user!.id, supabase);
    if (isAdmin) {
      // Admin can edit patches for any hack except informational archives
      // (already checked above)
    } else if (isDownloadableArchive) {
      // Check archiver (only for downloadable archives)
      const isEditableByArchiver = await canEditAsArchiver(hack, user!.id, supabase);
      if (!isEditableByArchiver) redirect(`/hack/${slug}`);
    } else {
      // Not creator, not admin, not downloadable archive
      redirect(`/hack/${slug}`);
    }
  }

  const { data: patchRows } = await supabase
    .from("patches")
    .select("id,version,label,info,base_rom,archived")
    .eq("parent_hack", slug)
    .order("created_at", { ascending: true });
  const existingVersions = [...new Set((patchRows || []).map((p) => p.version))];
  const existingPatchKeys = (patchRows || []).map((p) => `${p.version}::${(p.label || "").trim()}`);

  const baseRomIds = await getHackBaseRomIds(supabase, slug, hack.base_rom);
  const multiSource = isMultiEntryHack({ baseRomCount: baseRomIds.length, patches: patchRows || [] });

  const patcherSelection = await getPatcherSelectablePatches(supabase, slug, hack.current_patch);
  const isCustomPatcherActive = patcherSelection.savedPatchIds.length > 0;

  const currentPatch = patchRows?.find((p) => p.id === hack.current_patch);
  const currentVersion = isCustomPatcherActive ? hack.custom_version_name ?? undefined : currentPatch?.version;
  // A new multi-source version starts with the same patches as the latest one; the creator only swaps the files.
  const templateVersion = currentPatch?.version ?? [...(patchRows || [])].reverse().find((p) => !p.archived)?.version;
  const initialPatches = multiSource
    ? (patchRows || [])
        .filter((p) => !p.archived && p.version === templateVersion)
        .map((p) => ({ label: p.label, info: p.info, base_rom: p.base_rom }))
    : [];

  return (
    <div className="mx-auto max-w-screen-lg px-6 py-10">
      <h1 className={`flex flex-col gap-1 ${multiSource ? "max-w-[640px]" : "max-w-[480px]"}`}>
        <span className="text-[15px] font-medium text-text-2">Upload a new version of</span>
        <span className="font-display text-[32px] leading-[1.1] text-balance">{hack.title}</span>
      </h1>

      <div className={`mt-8 card p-5 ${multiSource ? "max-w-[640px]" : "max-w-[480px]"}`}>
        <HackPatchForm
          slug={slug}
          baseRomId={hack.base_rom}
          baseRomIds={baseRomIds}
          multiSource={multiSource}
          initialPatches={initialPatches}
          existingPatchKeys={existingPatchKeys}
          existingVersions={existingVersions}
          isCustomPatcherActive={isCustomPatcherActive}
          customVersionName={isCustomPatcherActive ? hack.custom_version_name : undefined}
          currentVersion={currentVersion}
          ai={aiDisclosureFromRow(hack)}
          isArchive={hack.is_archive}
        />
      </div>

      <div className="mt-8 flex items-center justify-center">
        <Link href={`/hack/${slug}`} className="items-center justify-center rounded-control border border-line bg-surface-2 px-3 py-2 text-sm font-medium hover:bg-surface-2">
          <FaChevronLeft size={16} className="inline-block mr-1" />
          Back to hack
        </Link>
      </div>
    </div>
  );
}



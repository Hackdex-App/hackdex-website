import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { canEditAsCreator, canEditAsAdmin } from "@/utils/hack";
import VersionList from "@/components/Hack/VersionList";
import DownloadPermissionSettings from "@/components/Hack/DownloadPermissionSettings";
import PatcherVersionManager, { type Patch } from "@/components/Hack/PatcherVersionManager";
import CollapsibleCard from "@/components/Primitives/CollapsibleCard";
import Link from "next/link";
import { FaChevronLeft, FaPlus, FaStar } from "react-icons/fa6";
import { getPatcherSelectablePatches } from "@/utils/patches/patcher-selectable-patches";

interface VersionsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function VersionsPage({ params }: VersionsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch hack
  const { data: hack } = await supabase
    .from("hacks")
    .select("slug, title, created_by, current_patch, custom_version_name, original_author, permission_from, base_rom, is_archive, patches_download_permission")
    .eq("slug", slug)
    .maybeSingle();

  if (!hack) return notFound();

  // Check if user can edit (creator or admin for version management)
  const canEdit = user ? (canEditAsCreator(hack, user.id) || await canEditAsAdmin(hack, user.id, supabase)) : false;

  // Fetch all published, non-archived patches
  const { data: patches } = await supabase
    .from("patches")
    .select("id, version, created_at, updated_at, changelog, published, archived, format")
    .eq("parent_hack", slug)
    .eq("published", true)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  // Also fetch unpublished patches if user can edit
  let unpublishedPatches: any[] = [];
  if (canEdit) {
    const { data: unpub } = await supabase
      .from("patches")
      .select("id, version, created_at, updated_at, changelog, published, archived, format")
      .eq("parent_hack", slug)
      .eq("published", false)
      .eq("archived", false)
      .order("created_at", { ascending: false });
    unpublishedPatches = unpub || [];
  }

  const allPatches: Patch[] = [...(patches || []), ...unpublishedPatches].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const patcherSelection = await getPatcherSelectablePatches(supabase, slug, hack.current_patch);
  const isCustomPatcherActive = patcherSelection.savedPatchIds.length > 0;

  return (
    <div className="mx-auto w-full max-w-screen-md px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <Link 
          href={`/hack/${slug}`}
          className="inline-flex items-center text-sm text-text-3 hover:text-text mb-3"
        >
          <FaChevronLeft size={14} className="mr-1" />
          Back to hack
        </Link>
        <h1 className="font-display text-[28px] leading-[1.1] md:text-[32px] mb-2">
          {canEdit ? "Manage Versions" : "Version History"}
        </h1>
        <p className="text-sm text-text-3 mb-4">
          {hack.title}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={`/hack/${slug}/changelog`}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded-control border border-line bg-surface-2 hover:bg-surface-3 transition-colors"
          >
            View Changelog
          </Link>
          {canEdit && (
            <Link
              href={`/hack/${slug}/edit/patch`}
              className="inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-control bg-accent-deep text-white hover:bg-accent-hover transition-colors"
            >
              <FaPlus size={14} className="mr-2" />
              Upload New Version
            </Link>
          )}
        </div>
      </div>

      {canEdit ? (
        <PatcherVersionManager
          hackSlug={slug}
          currentPatchId={hack.current_patch}
          initialSavedPatchIds={patcherSelection?.savedPatchIds ?? []}
          initialCustomVersionName={hack.custom_version_name}
          patches={allPatches}
          baseRom={hack.base_rom}
          patchesDownloadPermission={hack.patches_download_permission}
        >
          <DownloadPermissionSettings
            hackSlug={slug}
            initialPermission={hack.patches_download_permission}
            isCustomPatcherActive={isCustomPatcherActive}
          />
          <VersionStatusGuide canEdit={canEdit} isCustomPatcherActive={isCustomPatcherActive} />
        </PatcherVersionManager>
      ) : (
        <>
          <VersionStatusGuide canEdit={canEdit} isCustomPatcherActive={isCustomPatcherActive} />
          <VersionList
            patches={allPatches}
            currentPatchId={hack.current_patch}
            canEdit={canEdit}
            hackSlug={slug}
            baseRom={hack.base_rom}
            patchesDownloadPermission={hack.patches_download_permission}
            isCustomPatcherActive={isCustomPatcherActive}
            savedPatchIds={patcherSelection.savedPatchIds}
          />
        </>
      )}
    </div>
  );
}

function VersionStatusGuide({
  canEdit,
  isCustomPatcherActive,
}: {
  canEdit: boolean;
  isCustomPatcherActive: boolean;
}) {
  const showCurrentGuide = canEdit || !isCustomPatcherActive;
  const showPatchableGuide = canEdit || isCustomPatcherActive;

  return (
    <CollapsibleCard
      title="Version Status Guide"
      className="mb-6 bg-surface border border-line/50 rounded-card"
    >
      <div className="space-y-5 sm:space-y-2.5 text-sm text-text-2">
        {showCurrentGuide && (
        <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-2 sm:gap-1 items-start">
          <span className="inline-flex items-center gap-1 rounded-full bg-ready-soft px-2 py-0.5 text-xs font-medium text-ready shrink-0 w-fit">
            <FaStar size={10} />
            Current
          </span>
          <p className="text-text-2">
            {canEdit ?
              <>The version used by the <strong>Latest published patch</strong> option. This is the default downloader version when <strong>Custom</strong> patcher versions are not active.</> :
              "This is the version you will download when using the patch button on the hack page."
            }
          </p>
        </div>
        )}
        {canEdit && (
          <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-2 sm:gap-1 items-start">
            <span className="inline-flex items-center gap-1 rounded-full bg-ready-soft px-2 py-0.5 text-xs font-medium text-ready shrink-0 w-fit">
              <FaStar size={10} />
              Default
            </span>
            <p className="text-text-2">
              The first version in the Custom patcher list. This is the version players will download by default if they don't select a different version.
            </p>
          </div>
        )}
        {showPatchableGuide && (
        <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-2 sm:gap-1 items-start">
          <span className="inline-flex items-center gap-1 rounded-full bg-ready-soft px-2 py-0.5 text-xs font-medium text-ready shrink-0 w-fit">
            <FaStar size={10} />
            Patchable
          </span>
          <p className="text-text-2">
            {canEdit ?
              "Additional Custom versions available to choose from before using the patch button on the hack page." :
              "This version can be selected before using the patch button on the hack page."
            }
          </p>
        </div>
        )}
        {canEdit && <>
          <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-2 sm:gap-1 items-start">
            <span className="inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn shrink-0 w-fit">
              Unpublished
            </span>
            <p className="text-text-2">
              Versions that are only visible to you, and will not appear in the public version list or changelog.
            </p>
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-[100px_1fr] gap-2 sm:gap-1 items-start">
            <span className="inline-flex items-center rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0 w-fit">
              Archived
            </span>
            <p className="text-text-2">
              Same as unpublished, but archived versions are hidden from normal view on this page. Check "Show archived versions" to view and restore them.
            </p>
          </div>
        </>}
      </div>
    </CollapsibleCard>
  );
}


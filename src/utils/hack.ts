import type { SupabaseClient } from "@supabase/supabase-js";
import { checkUserRoles } from "@/utils/user";

type HackWithArchiveFields = {
  is_archive: boolean;
  original_author: string | null;
  current_patch: number | null;
  permission_from?: string | null;
  created_by: string;
};

/**
 * Check if a hack is an informational archive (archive flag set, no patch)
 */
export function isInformationalArchiveHack(hack: HackWithArchiveFields): boolean {
  return hack.is_archive === true && hack.current_patch === null;
}

/**
 * Check if a hack is a downloadable archive (archive flag set with patch and permission)
 */
export function isDownloadableArchiveHack(hack: HackWithArchiveFields): boolean {
  return hack.is_archive === true && hack.current_patch !== null && hack.permission_from != null;
}

/**
 * Check if a hack is any type of archive (informational or downloadable)
 */
export function isArchiveHack(hack: HackWithArchiveFields): boolean {
  return hack.is_archive === true;
}

/**
 * Check if a user can edit a hack as the creator
 */
export function canEditAsCreator(hack: HackWithArchiveFields, userId: string): boolean {
  return hack.created_by === userId;
}

/**
 * Check if a user can edit a hack as admin or archiver (for archive hacks only)
 * Requires a Supabase client to check RPC functions
 */
export async function canEditAsAdminOrArchiver(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>,
  options?: {
    roles?: {
      isAdmin: boolean;
      isArchiver: boolean;
    }
  },
): Promise<boolean> {
  if (!isArchiveHack(hack) || canEditAsCreator(hack, userId)) {
    return false;
  }

  if (options?.roles) {
    return options.roles.isAdmin || options.roles.isArchiver;
  }

  const { isAdmin, isArchiver } = await checkUserRoles(supabase);
  return isAdmin || isArchiver;
}

/**
 * Check if a user can edit a hack as archiver (for downloadable archives only)
 * Requires a Supabase client to check RPC functions
 */
export async function canEditAsArchiver(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>,
  options?: {
    roles?: {
      isArchiver: boolean;
    }
  },
): Promise<boolean> {
  if (!isDownloadableArchiveHack(hack) || canEditAsCreator(hack, userId)) {
    return false;
  }

  if (options?.roles) {
    return options.roles.isArchiver;
  }

  const { isArchiver } = await checkUserRoles(supabase);
  return isArchiver;
}

/**
 * Check if a user can edit a hack (as creator, admin, or archiver)
 * Returns an object with permission details
 */
export async function checkEditPermission(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>
): Promise<{
  canEdit: boolean;
  canEditAsCreator: boolean;
  canEditAsAdminOrArchiver: boolean;
  isInformationalArchive: boolean;
  isDownloadableArchive: boolean;
  isArchive: boolean;
}> {
  const canEditAsCreatorValue = canEditAsCreator(hack, userId);
  const isInformationalArchiveValue = isInformationalArchiveHack(hack);
  const isDownloadableArchiveValue = isDownloadableArchiveHack(hack);
  const isArchiveValue = isArchiveHack(hack);

  let canEditAsAdminOrArchiverValue = false;
  if (isArchiveValue && !canEditAsCreatorValue) {
    canEditAsAdminOrArchiverValue = await canEditAsAdminOrArchiver(hack, userId, supabase);
  }

  return {
    canEdit: canEditAsCreatorValue || canEditAsAdminOrArchiverValue,
    canEditAsCreator: canEditAsCreatorValue,
    canEditAsAdminOrArchiver: canEditAsAdminOrArchiverValue,
    isInformationalArchive: isInformationalArchiveValue,
    isDownloadableArchive: isDownloadableArchiveValue,
    isArchive: isArchiveValue,
  };
}

/**
 * Check if a user can edit a hack for patch operations (blocks informational archives)
 * Returns an object with permission details
 */
export async function checkPatchEditPermission(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>
): Promise<{
  canEdit: boolean;
  canEditAsCreator: boolean;
  canEditAsArchiver: boolean;
  isInformationalArchive: boolean;
  isDownloadableArchive: boolean;
  error?: string;
}> {
  const canEditAsCreatorValue = canEditAsCreator(hack, userId);
  const isInformationalArchiveValue = isInformationalArchiveHack(hack);
  const isDownloadableArchiveValue = isDownloadableArchiveHack(hack);

  // Informational archives cannot have patches
  if (isInformationalArchiveValue) {
    return {
      canEdit: false,
      canEditAsCreator: canEditAsCreatorValue,
      canEditAsArchiver: false,
      isInformationalArchive: isInformationalArchiveValue,
      isDownloadableArchive: isDownloadableArchiveValue,
      error: "Informational archives cannot have patch files",
    };
  }

  let canEditAsArchiverValue = false;
  if (isDownloadableArchiveValue && !canEditAsCreatorValue) {
    canEditAsArchiverValue = await canEditAsArchiver(hack, userId, supabase);
  }

  return {
    canEdit: canEditAsCreatorValue || canEditAsArchiverValue,
    canEditAsCreator: canEditAsCreatorValue,
    canEditAsArchiver: canEditAsArchiverValue,
    isInformationalArchive: isInformationalArchiveValue,
    isDownloadableArchive: isDownloadableArchiveValue,
  };
}


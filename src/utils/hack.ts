import type { SupabaseClient } from "@supabase/supabase-js";

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
 * Check if a user can edit a hack as admin (works for any hack, archive or not)
 * Requires a Supabase client to check RPC functions
 */
export async function canEditAsAdmin(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>,
  options?: {
    roles?: {
      isAdmin: boolean;
    }
  },
): Promise<boolean> {
  // Optimization: check creator first (no DB call)
  if (canEditAsCreator(hack, userId)) {
    return false;
  }

  if (options?.roles) {
    return options.roles.isAdmin;
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin ?? false;
}

/**
 * Check if a user can edit a hack as archiver (for archive hacks only)
 * Uses the SQL is_archiver() RPC which includes admins
 * Requires a Supabase client to check RPC functions
 */
export async function canEditAsArchiver(
  hack: HackWithArchiveFields,
  userId: string,
  supabase: SupabaseClient<any>,
  options?: {
    roles?: {
      isAdmin?: boolean;
      isArchiver?: boolean;
    }
  },
): Promise<boolean> {
  // Optimization: check creator first (no DB call)
  if (canEditAsCreator(hack, userId)) {
    return false;
  }

  // Only works for archive hacks
  if (!isArchiveHack(hack)) {
    return false;
  }

  if (options?.roles) {
    // If roles are provided, check both admin and archiver (admins are considered archivers)
    return (options.roles.isAdmin ?? false) || (options.roles.isArchiver ?? false);
  }

  // Use is_archiver() RPC directly (includes admins per SQL function)
  const { data: isArchiver } = await supabase.rpc("is_archiver");
  return isArchiver ?? false;
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
  canEditAsAdmin: boolean;
  canEditAsArchiver: boolean;
  isInformationalArchive: boolean;
  isDownloadableArchive: boolean;
  isArchive: boolean;
}> {
  // Optimization: check creator first (no DB call)
  const canEditAsCreatorValue = canEditAsCreator(hack, userId);
  const isInformationalArchiveValue = isInformationalArchiveHack(hack);
  const isDownloadableArchiveValue = isDownloadableArchiveHack(hack);
  const isArchiveValue = isArchiveHack(hack);

  let canEditAsAdminValue = false;
  let canEditAsArchiverValue = false;

  // Only check admin/archiver if not creator
  if (!canEditAsCreatorValue) {
    // Check admin (works for any hack)
    canEditAsAdminValue = await canEditAsAdmin(hack, userId, supabase);
    
    // Check archiver (only for archive hacks, and only if not admin)
    if (isArchiveValue && !canEditAsAdminValue) {
      canEditAsArchiverValue = await canEditAsArchiver(hack, userId, supabase);
    }
  }

  return {
    canEdit: canEditAsCreatorValue || canEditAsAdminValue || canEditAsArchiverValue,
    canEditAsCreator: canEditAsCreatorValue,
    canEditAsAdmin: canEditAsAdminValue,
    canEditAsArchiver: canEditAsArchiverValue,
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
  canEditAsAdmin: boolean;
  canEditAsArchiver: boolean;
  isInformationalArchive: boolean;
  isDownloadableArchive: boolean;
  error?: string;
}> {
  // Optimization: check creator first (no DB call)
  const canEditAsCreatorValue = canEditAsCreator(hack, userId);
  const isInformationalArchiveValue = isInformationalArchiveHack(hack);
  const isDownloadableArchiveValue = isDownloadableArchiveHack(hack);

  // Informational archives cannot have patches
  if (isInformationalArchiveValue) {
    return {
      canEdit: false,
      canEditAsCreator: canEditAsCreatorValue,
      canEditAsAdmin: false,
      canEditAsArchiver: false,
      isInformationalArchive: isInformationalArchiveValue,
      isDownloadableArchive: isDownloadableArchiveValue,
      error: "Informational archives cannot have patch files",
    };
  }

  let canEditAsAdminValue = false;
  let canEditAsArchiverValue = false;

  // Only check admin/archiver if not creator
  if (!canEditAsCreatorValue) {
    // Check admin (works for any hack)
    canEditAsAdminValue = await canEditAsAdmin(hack, userId, supabase);
    
    // Check archiver (only for downloadable archives, and only if not admin)
    if (isDownloadableArchiveValue && !canEditAsAdminValue) {
      canEditAsArchiverValue = await canEditAsArchiver(hack, userId, supabase);
    }
  }

  return {
    canEdit: canEditAsCreatorValue || canEditAsAdminValue || canEditAsArchiverValue,
    canEditAsCreator: canEditAsCreatorValue,
    canEditAsAdmin: canEditAsAdminValue,
    canEditAsArchiver: canEditAsArchiverValue,
    isInformationalArchive: isInformationalArchiveValue,
    isDownloadableArchive: isDownloadableArchiveValue,
  };
}


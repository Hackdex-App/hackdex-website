"use client";

import React from "react";
import Link from "next/link";
import { FiExternalLink, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight, FiArrowDown, FiSearch, FiLoader, FiDownload, FiInfo, FiBarChart2 } from "react-icons/fi";
import { getArchives } from "@/app/dashboard/archives/actions";
import { deleteHack } from "@/app/hack/actions";
import { baseRoms } from "@/data/baseRoms";
import Select from "@/components/Primitives/Select";

type Archive = {
  slug: string;
  title: string;
  original_author: string | null;
  permission_from: string | null;
  base_rom: string;
  created_at: string;
  created_by: string;
  creator_username: string | null;
  approved: boolean;
  current_patch: number | null;
  is_archive: boolean;
};

type ArchivesData =
  | { ok: true; archives: Archive[]; total: number; page: number; limit: number; totalPages: number }
  | { ok: false; error: string };

export default function ArchivesList({ initialData, isAdmin = false }: { initialData: ArchivesData; isAdmin?: boolean }) {
  const [data, setData] = React.useState<ArchivesData>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"title" | "created_at" | "original_author">("created_at");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [filter, setFilter] = React.useState<"all" | "downloadable" | "informational">("all");
  const [deletingSlug, setDeletingSlug] = React.useState<string | null>(null);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [filter]);

  const loadArchives = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getArchives({ page, limit: 50, search: debouncedSearch, sortBy, sortOrder, filter });
      setData(result);
    } catch (err: any) {
      setData({ ok: false, error: err?.message || "Failed to load archives" });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortBy, sortOrder, filter]);

  React.useEffect(() => {
    loadArchives();
  }, [loadArchives]);

  async function handleDelete(slug: string) {
    if (!confirm(`Delete the archive "${slug}"? Its page will 404 for everyone, and only a database edit can bring it back.`)) {
      return;
    }

    setDeletingSlug(slug);
    try {
      const result = await deleteHack({ slug });
      if (!result.ok) {
        alert(result.error || "Failed to delete archive");
        return;
      }
      // Reload current page
      await loadArchives();
    } catch (err: any) {
      alert(err?.message || "Failed to delete archive");
    } finally {
      setDeletingSlug(null);
    }
  }

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  if (!data.ok) {
    return (
      <div className="rounded-control border border-error/40 bg-error-soft p-4 text-sm text-error">
        {data.error}
      </div>
    );
  }

  const { archives, total, totalPages } = data;

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search by title, author, or base ROM..."
            className="w-full rounded-control bg-surface-2 px-10 py-3 md:py-2 text-lg md:text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          {search !== debouncedSearch && (
            <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 md:h-4 md:w-4 text-text-3 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={filter}
            onChange={(value) => setFilter(value as "all" | "downloadable" | "informational")}
            className="w-full md:w-auto"
            options={[
              { value: "all", label: "All Archives" },
              { value: "downloadable", label: "Downloadable" },
              { value: "informational", label: "Informational" },
            ]}
          />
          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value as any)}
            className="w-full md:w-auto"
            options={[
              { value: "created_at", label: "Sort by date" },
              { value: "title", label: "Sort by title" },
              { value: "original_author", label: "Sort by author" },
            ]}
          />
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="rounded-control border border-line bg-surface-2 px-6 md:px-3 py-2 text-sm hover:bg-surface-2"
          >
            <FiArrowDown className={`h-4 w-4 ${sortOrder !== "asc" ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-text-3">
        Showing {archives.length} of {total} archive{total !== 1 ? "s" : ""}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-card border border-line">
        {loading ? (
          <div className="p-8 text-center text-sm text-text-3">Loading...</div>
        ) : archives.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-3">No archives found</div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 bg-surface-2 px-4 py-2 text-xs text-text-3">
              <div className="col-span-1 text-center">Type</div>
              <div className="col-span-3">Title</div>
              <div className="col-span-2">Original Author</div>
              <div className="col-span-2">Permission From</div>
              <div className="col-span-1">Base ROM</div>
              <div className="col-span-1 text-xs">Archived by</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-line">
              {archives.map((archive) => {
                const baseRom = baseRoms.find((r) => r.id === archive.base_rom);
                const createdDate = new Date(archive.created_at).toLocaleDateString();
                const creator = archive.creator_username ? `@${archive.creator_username}` : "Unknown";
                const isDownloadable = archive.permission_from != null && archive.current_patch != null;
                const isInformational = archive.current_patch == null;

                return (
                  <div key={archive.slug} className="px-4 py-3 text-sm">
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-12 items-center gap-4">
                      <div className="col-span-1 flex items-center justify-center">
                        {isDownloadable && (
                          <FiDownload 
                            className="h-4 w-4 text-blue-600 dark:text-blue-400" 
                            title="Downloadable Archive"
                          />
                        )}
                        {isInformational && (
                          <FiInfo 
                            className="h-4 w-4 text-gray-600 dark:text-gray-400" 
                            title="Informational Archive"
                          />
                        )}
                      </div>
                      <Link href={`/hack/${archive.slug}`} target="_blank" className="group flex items-center gap-3 col-span-3 min-w-0 hover:text-text">
                        <div className="flex flex-col items-start min-w-0">
                          <div className="truncate font-medium group-hover:underline">{archive.title}</div>
                          <div className="mt-0.5 text-xs text-text-3 group-hover:text-text group-hover:underline">/{archive.slug}</div>
                        </div>
                        <FiExternalLink className="h-4 w-4 text-text-2 group-hover:text-text flex-shrink-0" />
                      </Link>
                      <div className="col-span-2 text-text-2">{archive.original_author || "—"}</div>
                      <div className="col-span-2 text-text-2">{archive.permission_from || "—"}</div>
                      <div className="col-span-1 text-text-2">{baseRom?.name || archive.base_rom}</div>
                      <div className="col-span-1 text-text-2 text-xs">
                        <div className="truncate">{creator}</div>
                        <div className="text-[10px] text-text-3">{createdDate}</div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        {isDownloadable && (
                          <Link
                            href={`/hack/${archive.slug}/stats`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-surface-2"
                            title="View Stats"
                          >
                            <FiBarChart2 className="h-4 w-4" />
                          </Link>
                        )}
                        <Link
                          href={`/hack/${archive.slug}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-surface-2"
                          title="Edit"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(archive.slug)}
                            disabled={deletingSlug === archive.slug}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-error-soft disabled:opacity-50"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4 text-error" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden flex flex-col gap-2">
                      <div className="group flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {isDownloadable && (
                            <FiDownload 
                              className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" 
                              title="Downloadable Archive"
                            />
                          )}
                          {isInformational && (
                            <FiInfo 
                              className="h-4 w-4 text-gray-600 dark:text-gray-400 flex-shrink-0" 
                              title="Informational Archive"
                            />
                          )}
                        <Link href={`/hack/${archive.slug}`} target="_blank">
                          <div className="text-lg font-bold group-hover:underline">{archive.title}</div>
                          <div className="text-xs text-text-3 group-hover:underline">/{archive.slug}</div>
                        </Link>
                        </div>
                        <FiExternalLink className="h-4 w-4 text-text-2 group-hover:text-text flex-shrink-0" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-3">
                        <span className="font-bold">Author: {archive.original_author || "—"}</span>
                        <span>|</span>
                        {archive.permission_from && <span className="font-bold">Permission: {archive.permission_from || "—"}</span>}
                        {archive.permission_from && <span>|</span>}
                        <span className="font-bold">Base: {baseRom?.name || archive.base_rom}</span>
                      </div>
                      <div className="flex flex-wrap items-center text-xs italic text-text-3">
                        Archived by {creator} on {createdDate}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {isDownloadable && (
                          <Link
                            href={`/hack/${archive.slug}/stats`}
                            className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-2 py-1 text-xs hover:bg-surface-2"
                          >
                            <FiBarChart2 className="h-3 w-3" />
                            Stats
                          </Link>
                        )}
                        <Link
                          href={`/hack/${archive.slug}/edit`}
                          className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-2 py-1 text-xs hover:bg-surface-2"
                        >
                          <FiEdit2 className="h-3 w-3" />
                          Edit
                        </Link>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(archive.slug)}
                            disabled={deletingSlug === archive.slug}
                            className="inline-flex items-center gap-1 rounded-control border border-error/40 bg-error-soft px-2 py-1 text-xs text-error hover:bg-error-soft disabled:opacity-50"
                          >
                            <FiTrash2 className="h-3 w-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="text-sm text-text-3">
            Page {page} of {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

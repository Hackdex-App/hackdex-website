"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { FaChevronDown, FaChevronUp, FaStar, FaDownload, FaTrash, FaRotateLeft, FaUpload, FaCheck, FaPlus } from "react-icons/fa6";
import { FiEdit2, FiEdit, FiX } from "react-icons/fi";
import VersionActions from "@/components/Hack/VersionActions";
import { updatePatchChangelog, updatePatchVersion } from "@/app/hack/[slug]/actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface Patch {
  id: number;
  version: string;
  created_at: string;
  updated_at: string | null;
  changelog: string | null;
  published: boolean;
  archived: boolean;
}

interface VersionListProps {
  patches: Patch[];
  currentPatchId: number | null;
  canEdit: boolean;
  hackSlug: string;
  baseRom: string;
}

export default function VersionList({ patches, currentPatchId, canEdit, hackSlug, baseRom }: VersionListProps) {
  // Initialize with first patch's changelog expanded if it exists
  const getInitialExpanded = () => {
    if (patches.length > 0) {
      const firstPatch = patches[0];
      if (firstPatch.changelog && firstPatch.changelog.trim().length > 0) {
        return new Set([firstPatch.id]);
      }
    }
    return new Set<number>();
  };

  const [expandedChangelogs, setExpandedChangelogs] = useState<Set<number>>(getInitialExpanded);
  const [editingChangelog, setEditingChangelog] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedPatches, setArchivedPatches] = useState<Patch[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggleChangelog = (patchId: number) => {
    const newExpanded = new Set(expandedChangelogs);
    if (newExpanded.has(patchId)) {
      newExpanded.delete(patchId);
    } else {
      newExpanded.add(patchId);
    }
    setExpandedChangelogs(newExpanded);
  };

  // Fetch archived patches when checkbox is checked
  useEffect(() => {
    if (showArchived && canEdit && archivedPatches.length === 0 && !loadingArchived) {
      setLoadingArchived(true);
      supabase
        .from("patches")
        .select("id, version, created_at, updated_at, changelog, published, archived")
        .eq("parent_hack", hackSlug)
        .eq("archived", true)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setArchivedPatches(data as Patch[]);
          }
          setLoadingArchived(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived, canEdit, hackSlug]);

  // Combine patches with archived patches when showing archived
  // Filter out any archived patches that are already in the regular patches list (e.g., after restore)
  const allPatches = showArchived && canEdit
    ? [...patches, ...archivedPatches.filter(archived => !patches.some(p => p.id === archived.id))].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : patches;

  if (patches.length === 0 && (!showArchived || archivedPatches.length === 0)) {
    return (
      <div className="card p-8 text-center">
        <p className="text-foreground/60">No versions available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {canEdit && (
        <label className="flex items-center gap-2 cursor-pointer py-2">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="text-sm font-medium">Show archived versions</span>
        </label>
      )}

      {allPatches.map((patch) => {
        const isCurrent = currentPatchId === patch.id;
        const hasChangelog = patch.changelog && patch.changelog.trim().length > 0;
        const isExpanded = expandedChangelogs.has(patch.id);
        const isEditing = editingChangelog === patch.id;
        const currentPatch = allPatches.find(p => p.id === currentPatchId);
        const currentPatchCreatedAt = currentPatch?.created_at || null;

        return (
          <div
            key={patch.id}
            className={`card p-4 sm:p-5 ${isCurrent ? "ring-2 ring-emerald-500/50" : ""}`}
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-2">
                    {editingVersion === patch.id ? (
                      <VersionEditor
                        patchId={patch.id}
                        initialVersion={patch.version}
                        hackSlug={hackSlug}
                        onSave={() => {
                          setEditingVersion(null);
                          router.refresh();
                        }}
                        onCancel={() => setEditingVersion(null)}
                      />
                    ) : (
                      <>
                        <h3 className="text-base sm:text-lg font-semibold">{patch.version}</h3>
                        {canEdit && (
                          <button
                            onClick={() => setEditingVersion(patch.id)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground/60 hover:text-foreground hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] touch-manipulation"
                            title="Edit version"
                            aria-label="Edit version"
                          >
                            <FiEdit size={14} />
                          </button>
                        )}
                      </>
                    )}
                    {isCurrent && editingVersion !== patch.id && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <FaStar size={10} />
                        Current
                      </span>
                    )}
                    {!patch.published && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Unpublished
                      </span>
                    )}
                    {patch.archived && (
                      <span className="inline-flex items-center rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-foreground/60">
                    <p>
                      Created: {new Date(patch.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {patch.updated_at && patch.updated_at !== patch.created_at && (
                      <p>
                        Updated: {new Date(patch.updated_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {canEdit && (
                    <VersionActions
                      patch={patch}
                      isCurrent={isCurrent}
                      hackSlug={hackSlug}
                      baseRom={baseRom}
                      currentPatchCreatedAt={currentPatchCreatedAt}
                      onActionComplete={() => {
                        router.refresh();
                        setEditingChangelog(null);
                        setEditingVersion(null);
                        // Clear archived patches to force refetch if checkbox is toggled
                        // This ensures restored/archived patches don't show duplicates
                        setArchivedPatches([]);
                      }}
                    />
                  )}
                </div>
              </div>

              {hasChangelog ? (
                <div className="border-t border-[var(--border)] pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleChangelog(patch.id)}
                      disabled={isEditing}
                      className="flex-1 flex items-center justify-between gap-3 py-2 text-left text-sm font-medium text-foreground/80 enabled:hover:text-foreground transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-foreground/60 group-hover:text-foreground/80 transition-colors group-disabled:hidden" aria-hidden={isEditing}>
                          {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                        </span>
                        <span>{isEditing ? "Edit Changelog" : "Changelog"}</span>
                      </span>
                    </button>
                    {canEdit && !isEditing && (
                      <button
                        onClick={() => {
                          setEditingChangelog(patch.id);
                          // Expand accordion if not already expanded
                          if (!isExpanded) {
                            toggleChangelog(patch.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
                        title="Edit changelog"
                      >
                        <FiEdit2 size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="ml-5 mt-2">
                      {isEditing ? (
                        <ChangelogEditor
                          patchId={patch.id}
                          initialChangelog={patch.changelog || ""}
                          hackSlug={hackSlug}
                          onSave={() => {
                            setEditingChangelog(null);
                            router.refresh();
                          }}
                          onCancel={() => setEditingChangelog(null)}
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none text-foreground/80">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSlug]}
                            components={{
                              h1: 'h2',
                              h2: 'h3',
                              h3: 'h4',
                              h4: 'h5',
                              h5: 'h6',
                              h6: 'h6',
                            }}
                          >
                            {patch.changelog || ""}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                canEdit && (
                  <div className="border-t border-[var(--border)] pt-3">
                    {isEditing ? (
                      <ChangelogEditor
                        patchId={patch.id}
                        initialChangelog={patch.changelog || ""}
                        hackSlug={hackSlug}
                        onSave={() => {
                          setEditingChangelog(null);
                          router.refresh();
                        }}
                        onCancel={() => setEditingChangelog(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingChangelog(patch.id)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-sm font-medium hover:bg-[var(--surface-3)] transition-colors"
                      >
                        <FaPlus size={12} />
                        <span>Add Changelog</span>
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChangelogEditor({
  patchId,
  initialChangelog,
  hackSlug,
  onSave,
  onCancel,
}: {
  patchId: number;
  initialChangelog: string;
  hackSlug: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [changelog, setChangelog] = useState(initialChangelog);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await updatePatchChangelog(hackSlug, patchId, changelog);
      if (result.ok) {
        onSave();
      } else {
        setError(result.error || "Failed to update changelog");
      }
    } catch (e) {
      setError("Failed to update changelog");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label className="hidden">Edit Changelog</label>
      <textarea
        value={changelog}
        onChange={(e) => setChangelog(e.target.value)}
        rows={8}
        className="w-full rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        placeholder="Enter changelog in Markdown format..."
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaCheck size={12} />
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function VersionEditor({
  patchId,
  initialVersion,
  hackSlug,
  onSave,
  onCancel,
}: {
  patchId: number;
  initialVersion: string;
  hackSlug: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [version, setVersion] = useState(initialVersion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = async () => {
    const trimmedVersion = version.trim();
    if (!trimmedVersion) {
      setError("Version cannot be empty");
      return;
    }

    if (trimmedVersion === initialVersion) {
      onCancel();
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await updatePatchVersion(hackSlug, patchId, trimmedVersion);
      if (result.ok) {
        onSave();
      } else {
        setError(result.error || "Failed to update version");
      }
    } catch (e) {
      setError("Failed to update version");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={version}
          onChange={(e) => {
            setVersion(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="w-auto min-w-[90px] rounded-md bg-[var(--surface-2)] px-2.5 py-1.5 text-base sm:text-lg font-semibold ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Version name"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !version.trim()}
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            title="Save version"
            aria-label="Save version"
          >
            <FaCheck size={12} />
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50 touch-manipulation"
            title="Cancel editing"
            aria-label="Cancel editing"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}


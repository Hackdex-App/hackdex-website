"use client";

import React from "react";
import { toast } from "sonner";
import { FiStar, FiTrash2, FiUpload } from "react-icons/fi";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { presignCoverUpload, saveHackCovers } from "@/app/hack/actions";
import type { Platform } from "@/data/baseRoms";
import { getCoverUrls } from "@/utils/format";
import { useCommitter, useDraftEditing } from "./DraftEditing";
import { MAX_COVERS } from "@/data/hackLimits";

interface Cover {
  key: string;
  url: string;
  /** Staged upload (manual mode): sent when the page is saved. */
  file?: File;
}

interface DraftGalleryProps {
  covers: Cover[];
  platform: Platform | undefined;
}


function allowedSizes(platform: Platform | undefined) {
  if (platform === "GB" || platform === "GBC") return [{ w: 160, h: 144 }];
  if (platform === "GBA") return [{ w: 240, h: 160 }];
  if (platform === "NDS") return [{ w: 256, h: 192 }, { w: 256, h: 384 }];
  return [];
}

function readSize(file: File) {
  return new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function upload(slug: string, key: string, file: File) {
  const presigned = await presignCoverUpload({ slug, objectKey: key });
  if (!presigned.ok) throw new Error(presigned.error);
  const put = await fetch(presigned.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/png" } });
  if (!put.ok) throw new Error("Upload failed");
}

/**
 * Screenshot manager in the Gallery tab. The first shot is the card cover;
 * star moves a shot there. Drafts save every change at once; listed hacks
 * stage changes (uploads included) until the page is saved.
 */
export default function DraftGallery({ covers: initial, platform }: DraftGalleryProps) {
  const { slug, live, run } = useDraftEditing();
  const [covers, setCovers] = React.useState<Cover[]>(initial);
  const [uploading, setUploading] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const sizes = allowedSizes(platform);
  const sizeHint = sizes.length ? sizes.map((s) => `${s.w}×${s.h}`).join(" or ") : "native resolution";

  const keys = (list: Cover[]) => list.map((c) => c.key);
  const changed = keys(covers).join("\n") !== keys(initial).join("\n");
  // The list prepare uploaded; commit saves exactly that, so a shot added mid-save stays staged.
  const saving = React.useRef<Cover[]>([]);
  useCommitter(
    changed,
    async () => {
      const list = saving.current;
      const res = await saveHackCovers({ slug, coverUrls: keys(list) });
      if (res.ok) setCovers((prev) => prev.map((c) => (c.file && list.some((s) => s.key === c.key) ? { key: c.key, url: c.url } : c)));
      return res;
    },
    // Uploads run before any of the page's changes publish.
    async () => {
      saving.current = covers;
      try {
        for (const c of saving.current) if (c.file) await upload(slug, c.key, c.file);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
      }
    },
  );

  const persist = (next: Cover[]) => {
    setCovers(next);
    if (live) void run(() => saveHackCovers({ slug, coverUrls: keys(next) }));
  };

  async function addFiles(files: File[]) {
    const room = MAX_COVERS - covers.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_COVERS} screenshots.`);
      return;
    }
    const picked = files.slice(0, room);
    setUploading(picked.length);
    const added: Cover[] = [];
    let rejected = 0;
    try {
      for (const [i, file] of picked.entries()) {
        const size = await readSize(file);
        if (!size || (sizes.length > 0 && !sizes.some((s) => s.w === size.w && s.h === size.h))) {
          rejected += 1;
          continue;
        }
        // Keys only allow [A-Za-z0-9._-], so a name like "shot 1.PNG " would be rejected by the server.
        const ext = (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const key = `${slug}/${Date.now()}-${i}.${ext}`;
        if (live) {
          await upload(slug, key, file);
          added.push({ key, url: getCoverUrls([key])[0] });
        } else {
          added.push({ key, url: URL.createObjectURL(file), file });
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(0);
    }
    if (rejected > 0) toast.error(`${rejected} ${rejected === 1 ? "image was" : "images were"} skipped. Screenshots must be ${sizeHint}.`);
    if (added.length > 0) persist([...covers, ...added]);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = covers.findIndex((c) => c.key === active.id);
    const to = covers.findIndex((c) => c.key === over.id);
    if (from === -1 || to === -1) return;
    persist(arrayMove(covers, from, to));
  }

  function feature(i: number) {
    if (i === 0) return;
    persist(arrayMove(covers, i, 0));
  }

  function remove(i: number) {
    if (live && !window.confirm("Delete this screenshot?")) return;
    if (covers[i].file) URL.revokeObjectURL(covers[i].url);
    persist(covers.filter((_, j) => j !== i));
  }

  // Staged previews are object URLs; free the rest when the gallery goes away.
  const coversRef = React.useRef(covers);
  coversRef.current = covers;
  React.useEffect(() => () => coversRef.current.forEach((c) => c.url.startsWith("blob:") && URL.revokeObjectURL(c.url)), []);

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-[70ch] text-sm text-text-2">
        Screenshots at {sizeHint}. The starred one is the cover players see in search results. Drag to reorder.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={covers.map((c) => c.key)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(264px,1fr))]">
            {covers.map((c, i) => (
              <Shot key={c.key} cover={c} index={i} featured={i === 0} onFeature={() => feature(i)} onRemove={() => remove(i)} />
            ))}
            {covers.length < MAX_COVERS && (
              <li>
                <button
                  type="button"
                  disabled={uploading > 0}
                  onClick={() => inputRef.current?.click()}
                  className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line-strong bg-well p-3 text-center text-sm text-text-2 transition-colors hover:border-text-3 hover:text-text disabled:cursor-wait disabled:opacity-70"
                >
                  <FiUpload className="h-6 w-6" />
                  <b className="font-semibold">{uploading > 0 ? `Uploading ${uploading}…` : "Add screenshots"}</b>
                  <span className="text-xs text-text-3">PNG or GIF, up to {MAX_COVERS}</span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/gif,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) void addFiles(files);
                  }}
                />
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Shot({ cover, index, featured, onFeature, onRemove }: { cover: Cover; index: number; featured: boolean; onFeature: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cover.key });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "z-10 opacity-70" : ""}>
      <div className={`group/shot relative flex justify-center rounded-card bg-well p-3 ${featured ? "shadow-[inset_0_0_0_2px_var(--rose)]" : ""}`}>
        <img
          src={cover.url}
          alt=""
          draggable={false}
          {...attributes}
          {...listeners}
          aria-label={`Screenshot ${index + 1}${featured ? ", the cover" : ""}. Drag to reorder.`}
          className="pixelated aspect-[3/2] w-full max-w-[240px] cursor-grab touch-none rounded-frame object-cover object-top active:cursor-grabbing"
        />
        {featured && <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent-deep px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
        <span className="absolute bottom-3 right-3 flex gap-1 opacity-0 transition-opacity group-focus-within/shot:opacity-100 group-hover/shot:opacity-100 max-md:opacity-100">
          <button
            type="button"
            onClick={onFeature}
            aria-pressed={featured}
            aria-label={featured ? "Cover screenshot" : "Make cover"}
            title={featured ? "Cover screenshot" : "Make cover"}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text shadow-rest transition-colors hover:bg-surface-2 ${featured ? "text-accent" : ""}`}
          >
            <FiStar className={`h-4 w-4 ${featured ? "fill-current" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Delete screenshot"
            title="Delete screenshot"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text shadow-rest transition-colors hover:bg-error-soft hover:text-error"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </span>
      </div>
    </li>
  );
}

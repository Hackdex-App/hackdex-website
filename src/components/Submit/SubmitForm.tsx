"use client";

import React from "react";
import Image from "next/image";
import { baseRoms } from "@/data/baseRoms";
import HackCard from "@/components/HackCard";
import type { Hack } from "@/data/hacks";
import { hacks as allHacks } from "@/data/hacks";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function SortableCoverItem({ id, index, url, onRemove }: { id: string; index: number; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-md">
      <div className={`h-16 flex items-center justify-between gap-3 p-2 bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--border)] ${isDragging ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="cursor-grab select-none pr-1 text-foreground/60" title="Drag to reorder" {...attributes} {...listeners}>⋮⋮</div>
          <div className="relative h-12 w-20 overflow-hidden rounded">
            <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs text-foreground/80">{url}</div>
            {index === 0 && <div className="text-[10px] text-emerald-400/90">Primary</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-red-600 transition-colors hover:bg-black/5 dark:text-red-300 dark:hover:bg-white/10"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

interface SubmitFormProps {
  dummy?: boolean;
}

export default function SubmitForm({ dummy = false }: SubmitFormProps) {
  const MAX_COVERS = 10;
  const [title, setTitle] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverUrls, setCoverUrls] = React.useState<string[]>([]);
  const [newCoversInput, setNewCoversInput] = React.useState("");
  const [baseRom, setBaseRom] = React.useState("Pokemon Emerald");
  const [version, setVersion] = React.useState("v0.1.0");
  const [boxArt, setBoxArt] = React.useState("");
  const [discord, setDiscord] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [pokecommunity, setPokecommunity] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagsInput, setTagsInput] = React.useState("");
  const [showMdPreview, setShowMdPreview] = React.useState(false);

  const parseUrls = (text: string) =>
    text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const addFromInput = () => {
    const urls = parseUrls(newCoversInput);
    if (urls.length === 0) return;
    setCoverUrls((prev) => [...prev, ...urls]);
    setNewCoversInput("");
  };
  const overLimit = coverUrls.length > MAX_COVERS;
  const overBy = Math.max(0, coverUrls.length - MAX_COVERS);


  const removeAt = (index: number) => {
    setCoverUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = coverUrls.map((url, i) => `${url}-${i}`);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setCoverUrls((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const existingTags = React.useMemo(() => {
    const set = new Set<string>();
    allHacks.forEach((h) => h.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, []);

  const suggestedTags = React.useMemo(() => {
    const q = tagsInput.trim().toLowerCase();
    if (!q) return [] as string[];
    return existingTags.filter((t) => t.toLowerCase().startsWith(q) && !tags.includes(t)).slice(0, 6);
  }, [existingTags, tags, tagsInput]);

  const addTag = (value: string) => {
    const tag = value.trim();
    if (!tag) return;
    if (tags.includes(tag)) return;
    setTags((prev) => [...prev, tag]);
    setTagsInput("");
  };

  const removeTagAt = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const onTagsKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagsInput);
    } else if (e.key === "Backspace" && !tagsInput && tags.length > 0) {
      // Quick backspace to remove last
      e.preventDefault();
      setTags((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const slug = slugify(title || "");

  const summaryLimit = 120;
  const summaryTooLong = summary.length > summaryLimit;

  const urlLike = (s: string) => !s || /^https?:\/\//i.test(s);

  const isValid =
    !!title.trim() &&
    !!author.trim() &&
    !!baseRom.trim() &&
    !!version.trim() &&
    coverUrls.length > 0 &&
    !!summary.trim() &&
    !summaryTooLong &&
    urlLike(boxArt) &&
    urlLike(discord) &&
    urlLike(twitter) &&
    urlLike(pokecommunity) &&
    !overLimit;

  const preview: Hack = {
    slug: slug || "preview",
    title: title || "Your hack title",
    author: author || "Your name",
    summary: (summary || "Short description, max 100 characters.") as string,
    description: (description || "Write a longer markdown description here.") as string,
    covers: coverUrls,
    baseRom: baseRom || "Pokemon Emerald",
    downloads: 0,
    version: version || "v0.1.0",
    tags,
    ...(boxArt ? { boxArt } : {}),
    socialLinks:
      discord || twitter || pokecommunity
        ? { discord: discord || undefined, twitter: twitter || undefined, pokecommunity: pokecommunity || undefined }
        : undefined,
    createdAt: new Date().toISOString(),
    patchUrl: "",
  };

  const isDummy = !!dummy;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_.9fr]">
      <div>
        <form className="grid gap-5">
            {/* Title */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Title</label>
              {!isDummy ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              ) : (
                <div
                  role="textbox"
                  aria-disabled
                  className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none"
                >
                  Your hack title
                </div>
              )}
              <div className="mt-1 text-xs text-foreground/60">URL preview: <span className="text-foreground/80">/hack/{slug || "your-title"}</span></div>
            </div>

            {/* Author */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Author</label>
              {!isDummy ? (
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              ) : (
                <div role="textbox" aria-disabled className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">Your name</div>
              )}
            </div>

            {/* Summary */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Short summary</label>
                <span className={`text-[11px] ${summaryTooLong ? "text-red-300" : "text-foreground/60"}`}>{summary.length}/{summaryLimit}</span>
              </div>
              {!isDummy ? (
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="<= 100 characters"
                  className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${summaryTooLong ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                />
              ) : (
                <div
                  role="textbox"
                  aria-disabled
                  className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset flex items-center text-foreground/60 select-none ${summaryTooLong ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                >
                  Short description, max 100 characters.
                </div>
              )}
            </div>

            {/* Long description */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Long description</label>
                {!isDummy && (
                  <div className="flex items-center gap-1 text-xs">
                    <button type="button" onClick={() => setShowMdPreview(false)} className={`px-2 py-1 rounded ${!showMdPreview ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : "text-foreground/70"}`}>Write</button>
                    <button type="button" onClick={() => setShowMdPreview(true)} className={`px-2 py-1 rounded ${showMdPreview ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : "text-foreground/70"}`}>Preview</button>
                  </div>
                )}
              </div>
              {isDummy ? (
                <div className="prose max-w-none h-36 rounded-md bg-[var(--surface-2)] px-3 py-2 ring-1 ring-inset ring-[var(--border)] text-foreground/60 select-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{description || "Write a longer markdown description here."}</ReactMarkdown>
                </div>
              ) : !showMdPreview ? (
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Supports Markdown"
                  className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              ) : (
                <div className="prose max-w-none rounded-md bg-[var(--surface-2)] px-3 py-2 ring-1 ring-inset ring-[var(--border)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{description || "Nothing to preview yet."}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Version */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Version</label>
              {!isDummy ? (
                <input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. v1.2.0"
                  className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              ) : (
                <div role="textbox" aria-disabled className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">v0.1.0</div>
              )}
            </div>

            {/* Tags */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Tags</label>
              <div className="rounded-md ring-1 ring-inset ring-[var(--border)] bg-[var(--surface-2)] px-2 py-2">
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-[var(--border)]">
                      {t}
                      {!isDummy && (
                        <button type="button" onClick={() => removeTagAt(i)} className="ml-1 text-foreground/70 hover:text-foreground">×</button>
                      )}
                    </span>
                  ))}
                  {!isDummy ? (
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      onKeyDown={onTagsKeyDown}
                      placeholder={tags.length ? "Add tag" : "Add tags (e.g. QoL, Challenge)"}
                      className="flex-1 min-w-[8rem] bg-transparent px-2 text-sm placeholder:text-foreground/50 focus:outline-none"
                    />
                  ) : (
                    <div className="flex-1 min-w-[8rem] px-2 text-sm text-foreground/50 select-none">{tags.length ? "Add tag" : "Add tags (e.g. QoL, Challenge)"}</div>
                  )}
                </div>
                {!isDummy && suggestedTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {suggestedTags.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px] text-foreground/85 ring-1 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cover images */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Cover images</label>
              <div className="space-y-3">
                {!isDummy ? (
                  <textarea
                    rows={2}
                    value={newCoversInput}
                    onChange={(e) => setNewCoversInput(e.target.value)}
                    placeholder="Paste one or multiple URLs (comma or newline separated)"
                    className="w-full rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  />
                ) : (
                  <div className="w-full h-14 rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] text-foreground/60 select-none">
                    Paste one or multiple URLs (comma or newline separated)
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {!isDummy ? (
                    <>
                      <button
                        type="button"
                        onClick={addFromInput}
                        disabled={coverUrls.length >= MAX_COVERS}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCoversInput("")}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        Clear
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" disabled className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-foreground/70 disabled:opacity-40">
                        Add
                      </button>
                      <button type="button" disabled className="inline-flex h-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-xs font-medium text-foreground/60 disabled:opacity-40">
                        Clear
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs text-foreground/60 flex justify-between">
                  <p>Images: <span className={overLimit ? "text-red-300 font-bold" : "text-foreground/60"}>{coverUrls.length}</span>/{MAX_COVERS}</p>
                  {overLimit && <p className="text-red-300/80 italic">Remove some to submit.</p>}
                </div>
                <div className="grid gap-2">
                  {coverUrls.length === 0 ? (
                    <p className="text-xs text-foreground/60">No images added yet. Add at least one to preview.</p>
                  ) : (
                    !isDummy ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext
                          items={coverUrls.map((url, i) => `${url}-${i}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {coverUrls.map((url, i) => (
                            <SortableCoverItem
                              key={`${url}-${i}`}
                              id={`${url}-${i}`}
                              index={i}
                              url={url}
                              onRemove={() => removeAt(i)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <>
                        {coverUrls.map((url, i) => (
                          <StaticCoverItem key={`${url}-${i}`} index={i} url={url} />
                        ))}
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Base ROM */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Base ROM</label>
              {!isDummy ? (
                <select
                  value={baseRom}
                  onChange={(e) => setBaseRom(e.target.value)}
                  className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  {baseRoms.map(({ name, region }) => (
                    <option key={name} value={name}>
                      {name} ({region})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">{baseRom}</div>
              )}
            </div>

            {/* Box art URL */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Box art URL <span className="text-foreground/60">(optional)</span></label>
              {!isDummy ? (
                <input
                  value={boxArt}
                  onChange={(e) => setBoxArt(e.target.value)}
                  placeholder="https://..."
                  className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${boxArt && !urlLike(boxArt) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                />
              ) : (
                <div className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset flex items-center text-foreground/60 select-none ${boxArt && !urlLike(boxArt) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}>https://...</div>
              )}
            </div>

            {/* Social links */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Social links <span className="text-foreground/60">(optional)</span></label>
              <div className="grid gap-2 sm:grid-cols-3">
                {!isDummy ? (
                  <>
                    <input
                      value={discord}
                      onChange={(e) => setDiscord(e.target.value)}
                      placeholder="Discord invite URL"
                      className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${discord && !urlLike(discord) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                    />
                    <input
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="Twitter/X profile URL"
                      className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${twitter && !urlLike(twitter) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                    />
                    <input
                      value={pokecommunity}
                      onChange={(e) => setPokecommunity(e.target.value)}
                      placeholder="PokeCommunity thread URL"
                      className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${pokecommunity && !urlLike(pokecommunity) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}
                    />
                  </>
                ) : (
                  <>
                    <div className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset flex items-center text-foreground/60 select-none ${discord && !urlLike(discord) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}>Discord invite URL</div>
                    <div className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset flex items-center text-foreground/60 select-none ${twitter && !urlLike(twitter) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}>Twitter/X profile URL</div>
                    <div className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset flex items-center text-foreground/60 select-none ${pokecommunity && !urlLike(pokecommunity) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "bg-[var(--surface-2)] ring-[var(--border)]"}`}>PokeCommunity thread URL</div>
                  </>
                )}
              </div>
              <p className="text-xs text-foreground/60">Use full URLs starting with http:// or https://</p>
            </div>

            {/* Upload patch file */}
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Upload patch file</label>
              {!isDummy ? (
                <input type="file" className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer" />
              ) : (
                <div className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] select-none">Choose file</div>
              )}
              <p className="text-xs text-foreground/60">BPS only for verification purposes.</p>
            </div>

            {/* Submit button */}
            {!isDummy && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!isValid}
                  className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
                >
                  <span>Submit</span>
                </button>
                {!isValid && (
                  <span className="text-xs text-red-600/90">Fill required fields, fix errors, and add at least one cover.</span>
                )}
              </div>
            )}
        </form>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-20 self-start">
        <PreviewCard hack={preview} />
        <div className="card h-max p-5">
          <div className="text-[15px] font-semibold tracking-tight">Submission tips</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/75">
            <li>Use a reliable image URL (e.g. `imgur`).</li>
            <li>Include the exact expected base ROM name.</li>
            <li>Describe notable features, difficulty, and target players.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function PreviewCard({ hack }: { hack: Hack }) {
  return <HackCard hack={hack} clickable={false} />;
}

function StaticCoverItem({ index, url }: { index: number; url: string }) {
  return (
    <div className="rounded-md">
      <div className="h-16 flex items-center justify-between gap-3 p-2 bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="pr-1 text-foreground/40 select-none" title="Drag disabled">⋮⋮</div>
          <div className="relative h-12 w-20 overflow-hidden rounded">
            <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs text-foreground/80">{url}</div>
            {index === 0 && <div className="text-[10px] text-emerald-400/90">Primary</div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-foreground/50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}



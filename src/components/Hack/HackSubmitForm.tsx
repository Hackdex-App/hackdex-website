"use client";

import React from "react";
import Image from "next/image";
import { baseRoms } from "@/data/baseRoms";
import HackCard from "@/components/HackCard";
import { createClient } from "@/utils/supabase/client";
import { prepareSubmission, presignPatchAndSaveCovers, confirmPatchUpload } from "@/app/submit/actions";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import TagSelector from "@/components/Submit/TagSelector";
import BinFile from "rom-patcher-js/rom-patcher-js/modules/BinFile.js";
import BPS from "rom-patcher-js/rom-patcher-js/modules/RomPatcher.format.bps.js";
import { sha1Hex } from "@/utils/hash";
import { platformAccept } from "@/utils/idb";

function SortableCoverItem({ id, index, url, filename, onRemove }: { id: string; index: number; url: string; filename: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="rounded-md">
      <div className={`h-16 flex items-center justify-between gap-3 p-2 bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--border)] ${isDragging ? "opacity-60" : ""}`}>
        <div className="flex items-center gap-3">
          <div className="cursor-grab select-none pr-1 text-foreground/60" title="Drag to reorder" {...attributes} {...listeners}>
            <RxDragHandleDots2 size={24} />
          </div>
          <div className="relative h-12 w-20 overflow-hidden rounded">
            <Image src={url} alt={`Cover ${index + 1}`} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate max-w-[260px] text-xs text-foreground/80">{filename}</div>
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

interface HackSubmitFormProps {
  dummy?: boolean;
}

export default function HackSubmitForm({ dummy = false }: HackSubmitFormProps) {
  const MAX_COVERS = 10;
  const { profile } = useAuthContext();
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [newCoverFiles, setNewCoverFiles] = React.useState<File[]>([]);
  const [coverErrors, setCoverErrors] = React.useState<string[]>([]);
  const [baseRom, setBaseRom] = React.useState("");
  const [platform, setPlatform] = React.useState<"GB" | "GBC" | "GBA" | "NDS" | "">("");
  const [version, setVersion] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [boxArt, setBoxArt] = React.useState("");
  const [discord, setDiscord] = React.useState("");
  const [twitter, setTwitter] = React.useState("");
  const [pokecommunity, setPokecommunity] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [showMdPreview, setShowMdPreview] = React.useState(false);
  const [patchFile, setPatchFile] = React.useState<File | null>(null);
  const [patchMode, setPatchMode] = React.useState<"bps" | "rom">("bps");
  const [genStatus, setGenStatus] = React.useState<"idle" | "generating" | "ready" | "error">("idle");
  const [genError, setGenError] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const supabase = createClient();
  const isDummy = !!dummy;

  const titleInputRef = React.useRef<HTMLInputElement | null>(null);
  const versionInputRef = React.useRef<HTMLInputElement | null>(null);
  const screenshotsInputRef = React.useRef<HTMLInputElement | null>(null);
  const patchInputRef = React.useRef<HTMLInputElement | null>(null);
  const modifiedRomInputRef = React.useRef<HTMLInputElement | null>(null);

  const baseRomEntry = React.useMemo(() => baseRoms.find((r) => r.id === baseRom) || null, [baseRom]);
  const baseRomName = baseRomEntry?.name || "";
  const baseRomPlatform = baseRomEntry?.platform;
  const { isLinked, hasPermission, hasCached, importUploadedBlob, ensurePermission, getFileBlob, supported } = useBaseRoms();

  const baseRomReady = baseRom && (hasPermission(baseRom) || hasCached(baseRom));
  const baseRomNeedsPermission = baseRom && isLinked(baseRom) && !baseRomReady;
  const baseRomMissing = baseRom && !isLinked(baseRom) && !hasCached(baseRom);

  const coverPreviews = React.useMemo(() => {
    return newCoverFiles.map((f) => URL.createObjectURL(f));
  }, [newCoverFiles]);

  React.useEffect(() => {
    return () => {
      coverPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [coverPreviews]);

  React.useEffect(() => {
    setPatchFile(null);
    setGenStatus("idle");
    setGenError("");
    patchInputRef.current && (patchInputRef.current.value = "");
    modifiedRomInputRef.current && (modifiedRomInputRef.current.value = "");
  }, [patchMode]);

  const uploadCovers = async (slug: string) => {
    if (!newCoverFiles || newCoverFiles.length === 0) return [] as string[];
    const urls: string[] = [];
    for (let i = 0; i < newCoverFiles.length; i++) {
      const file = newCoverFiles[i];
      const fileExt = file.name.split('.').pop();
      const path = `${slug}/${Date.now()}-${i}.${fileExt}`;
      const { error } = await supabase.storage.from('hack-covers').upload(path, file);
      if (error) throw error;
      urls.push(path);
    }
    return urls;
  };

  function getAllowedSizesForPlatform(platform: "GB" | "GBC" | "GBA" | "NDS") {
    if (platform === "GB" || platform === "GBC") return [{ w: 160, h: 144 }];
    if (platform === "GBA") return [{ w: 240, h: 160 }];
    return [{ w: 256, h: 192 }, { w: 256, h: 384 }];
  }

  async function validateImageDimensions(file: File, allowed: { w: number; h: number }[]) {
    return new Promise<boolean>((resolve) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const ok = allowed.some((s) => img.naturalWidth === s.w && img.naturalHeight === s.h);
        URL.revokeObjectURL(url);
        resolve(ok);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      img.src = url;
    });
  }
  const overLimit = newCoverFiles.length > MAX_COVERS;

  const removeAt = (index: number) => {
    setNewCoverFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = newCoverFiles.map((f, i) => `${f.name}-${i}`);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setNewCoverFiles((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  React.useEffect(() => {
    if (isDummy) return;
    if (step === 1) {
      titleInputRef.current?.focus();
    } else if (step === 2) {
      versionInputRef.current?.focus();
    } else if (step === 3) {
      screenshotsInputRef.current?.focus();
    } else if (step === 4) {
      patchInputRef.current?.focus();
    }
  }, [step, isDummy]);

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const slug = slugify(title || "");

  const summaryLimit = 120;
  const summaryTooLong = summary.length > summaryLimit;

  const allowedSizes = platform ? getAllowedSizesForPlatform(platform) : [];

  const urlLike = (s: string) => !s || /^https?:\/\//i.test(s);

  const allSocialValid = [discord, twitter, pokecommunity].every((s) => !s || urlLike(s));

  const step1Valid = !!title.trim() && !!platform && !!baseRom.trim() && !!language.trim();
  const step2Valid = !!version.trim() && !!summary.trim() && !summaryTooLong && !!description.trim() && tags.length > 0;
  const step3Valid = (newCoverFiles.length > 0) && !overLimit && coverErrors.length === 0 && (!boxArt.trim() || urlLike(boxArt)) && allSocialValid;
  const isValid = step1Valid && step2Valid && step3Valid && !!patchFile;

  const onSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('title', title);
      fd.set('summary', summary);
      fd.set('description', description);
      fd.set('base_rom', baseRom);
      fd.set('language', language);
      fd.set('version', version);
      if (boxArt) fd.set('box_art', boxArt);
      if (discord) fd.set('discord', discord);
      if (twitter) fd.set('twitter', twitter);
      if (pokecommunity) fd.set('pokecommunity', pokecommunity);
      if (tags.length) fd.set('tags', tags.join(','));

      const prepared = await prepareSubmission(fd);
      if (!prepared.ok) throw new Error(prepared.error || 'Failed to prepare');

      const uploadedCoverUrls = await uploadCovers(prepared.slug);
      const presigned = await presignPatchAndSaveCovers({ slug: prepared.slug, version, coverUrls: uploadedCoverUrls });
      if (!presigned.ok) throw new Error(presigned.error || 'Failed to presign');

      if (patchFile) {
        await fetch(presigned.presignedUrl, { method: 'PUT', body: patchFile, headers: { 'Content-Type': 'application/octet-stream' } });
        const finalized = await confirmPatchUpload({ slug: prepared.slug, objectKey: presigned.objectKey!, version });
        if (!finalized.ok) throw new Error(finalized.error || 'Failed to finalize');
        window.location.href = finalized.redirectTo!;
      } else {
        window.location.href = `/hack/${prepared.slug}`;
      }
    } catch (e: any) {
      alert(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  async function onGrantPermission() {
    if (!baseRom) return;
    await ensurePermission(baseRom, true);
  }

  async function onUploadBaseRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenError("");
      const f = e.target.files?.[0];
      if (!f) return;
      const matchedId = await importUploadedBlob(f);
      if (!matchedId) {
        setGenError("That ROM doesn't match any supported base ROM.");
        return;
      }
      if (matchedId !== baseRom) {
        const matchedName = baseRoms.find(r => r.id === matchedId)?.name;
        setGenError(`This ROM matches "${matchedName ?? matchedId}", but the form requires "${baseRomName}".`);
        return;
      }
    } catch {
      setGenError("Failed to import base ROM.");
    }
  }

  async function onUploadModifiedRom(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setGenStatus("generating");
      setGenError("");
      const mod = e.target.files?.[0] || null;
      if (!mod || !baseRom) {
        setGenStatus("idle");
        return;
      }
      let baseFile = await getFileBlob(baseRom);
      if (!baseFile) {
        setGenStatus("idle");
        setGenError("Base ROM not available.");
        return;
      }
      if (baseRomEntry?.sha1) {
        const hash = await sha1Hex(baseFile);
        if (hash.toLowerCase() !== baseRomEntry.sha1.toLowerCase()) {
          setGenStatus("error");
          setGenError("Selected base ROM hash does not match the chosen base ROM.");
          return;
        }
      }
      const [origBuf, modBuf] = await Promise.all([baseFile.arrayBuffer(), mod.arrayBuffer()]);
      const origBin = new BinFile(origBuf);
      const modBin = new BinFile(modBuf);
      const deltaMode = origBin.fileSize <= 4194304;
      const patch = BPS.buildFromRoms(origBin, modBin, deltaMode);
      const fileName = slug || title || "patch";
      const patchBin = patch.export(fileName);
      const out = new File([patchBin._u8array], `${fileName}.bps`, { type: 'application/octet-stream' });
      setPatchFile(out);
      setGenStatus("ready");
    } catch (err: any) {
      setGenStatus("error");
      setGenError(err?.message || "Failed to generate patch.");
    }
  }

  const preview = {
    slug: slug || "preview",
    title: title || "Your hack title",
    author: profile?.username ? `@${profile.username}` : "You",
    summary: (summary || "Short description, max 100 characters.") as string,
    description: (description || "Write a longer markdown description here.") as string,
    covers: coverPreviews,
    baseRomId: baseRom,
    downloads: 0,
    version: version || "v0.0.0",
    tags,
    ...(boxArt ? { boxArt } : {}),
    socialLinks:
      discord || twitter || pokecommunity
        ? { discord: discord || undefined, twitter: twitter || undefined, pokecommunity: pokecommunity || undefined }
        : undefined,
    createdAt: new Date().toISOString(),
    patchUrl: "",
  };

  const hasBaseRom = !!baseRom.trim();

  return (
    <div className="flex flex-col gap-8 lg:flex-row w-full">
      <div className="flex-1">
        <form className="grid gap-5">
          <div className="text-xs italic text-foreground/60">* Required</div>

          {step === 1 && (
            <>
              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Title <span className="text-red-500">*</span></label>
                {!isDummy ? (
                  <input
                    ref={titleInputRef}
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

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Platform <span className="text-red-500">*</span></label>
                {!isDummy ? (
                  <select
                    value={platform}
                    onChange={(e) => { if ((newCoverFiles.length) > 0) return; setPlatform(e.target.value as any); setBaseRom(""); }}
                    disabled={newCoverFiles.length > 0}
                    className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
                  >
                    <option value="" disabled>Select platform</option>
                    {(["GB","GBC","GBA","NDS"] as const).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                ) : (
                  <div className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">{platform || ""}</div>
                )}
                {newCoverFiles.length > 0 && (
                  <div className="text-xs text-red-500">Please remove all screenshots before changing the platform.</div>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Base ROM <span className="text-red-500">*</span></label>
                {!isDummy ? (
                  <select
                    value={baseRom}
                    onChange={(e) => setBaseRom(e.target.value)}
                    disabled={!platform}
                    className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50"
                  >
                    <option value="" disabled>{platform ? "Select base rom" : "Select platform first"}</option>
                    {baseRoms.filter(r => !platform || r.platform === platform).map(({ id, name, region }) => (
                      <option key={id} value={id}>
                        {name.replace('Pokemon ', '')} ({region})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">{baseRoms.find(r=>r.id===baseRom)?.name || baseRom}</div>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Language <span className="text-red-500">*</span></label>
                {!isDummy ? (
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="" disabled>Select language</option>
                    {['English','Spanish','French','German','Italian','Portuguese','Japanese','Chinese','Korean','Other'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                ) : (
                  <div role="textbox" aria-disabled className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">{language}</div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Version <span className="text-red-500">*</span></label>
                {!isDummy ? (
                  <input
                    ref={versionInputRef}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. v1.2.0"
                    className={`h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]`}
                  />
                ) : (
                  <div role="textbox" aria-disabled className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] flex items-center text-foreground/60 select-none">v0.1.0</div>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Tags <span className="text-red-500">*</span></label>
                <TagSelector value={tags} onChange={setTags} />
              </div>

              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground/80">Summary <span className="text-red-500">*</span></label>
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

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground/80">Description <span className="text-red-500">*</span></label>
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
                    rows={14}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Supports Markdown"
                    className={`rounded-md bg-[var(--surface-2)] px-3 py-2 min-h-[14rem] text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]`}
                  />
                ) : (
                  <div className={`prose max-w-none rounded-md bg-[var(--surface-2)] min-h-[14rem] px-3 py-2 ring-1 ring-inset ring-[var(--border)] ${description ? "" : "text-foreground/60 text-sm"}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{description || "Nothing to preview yet."}</ReactMarkdown>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Screenshots <span className="text-red-500">*</span></label>
                {allowedSizes.length > 0 && (
                  <p className="text-xs text-foreground/60">Upload screenshots of your game. Allowed sizes: {allowedSizes.map((s) => `${s.w}x${s.h}`).join(", ")}.</p>
                )}
                <div className="space-y-3">
                  {!isDummy ? (
                    <input
                      ref={screenshotsInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={async (e) => {
                        const list = Array.from(e.target.files || []);
                        const allowed = baseRoms.find(r => r.id === baseRom)?.platform;
                        const sizes = allowed ? getAllowedSizesForPlatform(allowed) : [];
                        const accepted: File[] = [];
                        const errors: string[] = [];
                        for (const f of list) {
                          if (sizes.length === 0) { accepted.push(f); continue; }
                          const ok = await validateImageDimensions(f, sizes);
                          if (ok) accepted.push(f); else errors.push(f.name);
                        }
                        setCoverErrors(errors);
                        setNewCoverFiles((prev) => [...prev, ...accepted]);
                      }}
                      className={`w-full rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none ${!hasBaseRom ? 'pointer-events-none opacity-50 blur-[1px]' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-14 rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] text-foreground/60 select-none">
                      Choose images to upload
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {!isDummy ? (
                      <>
                        <button
                          type="button"
                          onClick={() => { setNewCoverFiles([]); }}
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
                    <p>Images: <span className={overLimit ? "text-red-300 font-bold" : "text-foreground/60"}>{newCoverFiles.length}</span>/{MAX_COVERS}</p>
                    {overLimit && <p className="text-red-300/80 italic">Remove some to submit.</p>}
                  </div>
                  {coverErrors.length > 0 && (
                    <div className="text-xs text-red-400">
                      Rejected (wrong size): {coverErrors.join(", ")}
                    </div>
                  )}
                  <div className="grid gap-2">
                    {newCoverFiles.length === 0 ? (
                      <p className="text-xs text-foreground/60">No images added yet. Add at least one to preview.</p>
                    ) : (
                      !isDummy ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                          <SortableContext
                            items={newCoverFiles.map((f, i) => `${f.name}-${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {newCoverFiles.map((f, i) => (
                              <SortableCoverItem
                                key={`${f.name}-${i}`}
                                id={`${f.name}-${i}`}
                                index={i}
                                filename={f.name}
                                url={URL.createObjectURL(f)}
                                onRemove={() => removeAt(i)}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      ) : null
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Box art URL</label>
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

              <div className="grid gap-2">
                <label className="text-sm text-foreground/80">Social links</label>
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
            </>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <label className="text-sm text-foreground/80">Provide patch <span className="text-red-500">*</span></label>
              {!isDummy ? (
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => setPatchMode("bps")}
                      className={`rounded-md rounded-r-none px-3 py-1.5 text-xs border-l-1 border-y-1 ${patchMode === "bps" ? "bg-[var(--surface-2)] border-[var(--border)]" : "text-foreground/70 border-[var(--border)]"}`}
                    >
                      Upload .bps
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatchMode("rom")}
                      className={`rounded-md rounded-l-none px-3 py-1.5 text-xs border-1 ${patchMode === "rom" ? "bg-[var(--surface-2)] border-[var(--border)]" : "text-foreground/70 border-[var(--border)]"}`}
                    >
                      Upload modified ROM (auto-generate .bps)
                    </button>
                  </div>

                  {patchMode === "bps" && (
                    <div className="grid gap-2">
                      <input
                        ref={patchInputRef}
                        onChange={(e) => setPatchFile(e.target.files?.[0] || null)}
                        type="file"
                        accept=".bps"
                        className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] file:bg-black/10 dark:file:bg-[var(--surface-2)] file:text-foreground/80 file:text-sm file:font-medium file:not-italic file:rounded-md file:border-0 file:px-3 file:py-2 file:mr-2 file:cursor-pointer"
                      />
                      <p className="text-xs text-foreground/60">Upload a BPS patch file.</p>
                    </div>
                  )}

                  {patchMode === "rom" && (
                    <div className="grid gap-3">
                      <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--surface-2)]/50">
                        <div className="text-xs text-foreground/75">Required base ROM</div>
                        <div className="mt-1 text-sm font-medium">{baseRomEntry ? `${baseRomEntry.name} (${baseRomEntry.platform})` : "Select a base ROM in Step 1"}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 ring-1 ${baseRomReady ? "bg-emerald-600/60 text-white ring-emerald-700/80 dark:bg-emerald-500/25 dark:text-emerald-100 dark:ring-emerald-400/90" : baseRomNeedsPermission ? "bg-amber-600/60 text-white ring-amber-700/80 dark:bg-amber-500/50 dark:text-amber-100 dark:ring-amber-400/90" : "bg-red-600/60 text-white ring-red-700/80 dark:bg-red-500/50 dark:text-red-100 dark:ring-red-400/90"}`}>
                            {baseRomReady ? "Ready" : baseRomNeedsPermission ? "Permission needed" : "Base ROM needed"}
                          </span>
                          {baseRomNeedsPermission && (
                            <button type="button" onClick={onGrantPermission} disabled={!supported} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed">Grant permission</button>
                          )}
                          {baseRomMissing && (
                            <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                              <input type="file" onChange={onUploadBaseRom} className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-xs ring-1 ring-inset ring-[var(--border)]" />
                              <span>Upload base ROM</span>
                            </label>
                          )}
                        </div>
                        {!!genError && <div className="mt-2 text-xs text-red-400">{genError}</div>}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm text-foreground/80">Modified ROM</label>
                        <input
                          ref={modifiedRomInputRef}
                          type="file"
                          accept={baseRomPlatform ? platformAccept(baseRomPlatform) : "*/*"}
                          disabled={!baseRomEntry || !baseRomReady || !baseRomPlatform}
                          onChange={onUploadModifiedRom}
                          className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-foreground/60">We'll generate a .bps patch on-device. No ROMs are uploaded.</p>
                        {genStatus === "generating" && <div className="text-xs text-foreground/70">Generating patch…</div>}
                        {genStatus === "ready" && patchFile && <div className="text-xs text-emerald-400/90">Patch ready: {patchFile.name}</div>}
                        {genStatus === "error" && !!genError && <div className="text-xs text-red-400">{genError}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm italic text-foreground/50 ring-1 ring-inset ring-[var(--border)] select-none">Choose file</div>
              )}
            </div>
          )}

          {!isDummy && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4 mt-4">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1 || submitting}
                className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground/60">Step {step} of 4</span>
              </div>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(4, s + 1))}
                  disabled={
                    submitting ||
                    (step === 1 && !step1Valid) ||
                    (step === 2 && !step2Valid) ||
                    (step === 3 && !step3Valid)
                  }
                  className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm font-semibold text-foreground transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!isValid || submitting}
                  className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
                >
                  <span>{submitting ? 'Submitting…' : 'Submit'}</span>
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-20 self-start basis-[360px]">
        <HackCard hack={preview} clickable={false} />
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



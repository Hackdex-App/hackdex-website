"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TagSelector from "@/components/Submit/TagSelector";
import { baseRoms } from "@/data/baseRoms";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { updateHack } from "@/app/hack/actions";
import { saveHackCovers } from "@/app/hack/actions";
import SortableCovers from "@/components/Hack/SortableCovers";

interface HackEditFormProps {
  slug: string;
  initial: {
    title: string;
    summary: string;
    description: string;
    base_rom: string;
    language: string;
    version: string;
    box_art: string | null;
    social_links: { discord?: string; twitter?: string; pokecommunity?: string } | null;
    tags: string[];
    coverKeys: string[]; // storage keys for covers in order
    signedCoverUrls?: string[]; // optional signed URLs aligned to keys
  };
}

export default function HackEditForm({ slug, initial }: HackEditFormProps) {
  const supabase = createClient();
  const MAX_COVERS = 10;
  const [title, setTitle] = React.useState(initial.title);
  const [summary, setSummary] = React.useState(initial.summary);
  const [description, setDescription] = React.useState(initial.description);
  const [showMdPreview, setShowMdPreview] = React.useState(false);
  const [baseRom, setBaseRom] = React.useState(initial.base_rom);
  const [language, setLanguage] = React.useState(initial.language);
  const [version, setVersion] = React.useState(initial.version);
  const [boxArt, setBoxArt] = React.useState(initial.box_art || "");
  const [discord, setDiscord] = React.useState(initial.social_links?.discord || "");
  const [twitter, setTwitter] = React.useState(initial.social_links?.twitter || "");
  const [pokecommunity, setPokecommunity] = React.useState(initial.social_links?.pokecommunity || "");
  const [tags, setTags] = React.useState<string[]>(initial.tags || []);

  // Baseline state used for change detection and reverting
  const [baseline, setBaseline] = React.useState({
    title: initial.title,
    summary: initial.summary,
    description: initial.description,
    language: initial.language,
    boxArt: initial.box_art || "",
    tags: initial.tags || [],
    discord: initial.social_links?.discord || "",
    twitter: initial.social_links?.twitter || "",
    pokecommunity: initial.social_links?.pokecommunity || "",
  });

  type CoverItem =
    | { type: "existing"; key: string; url: string }
    | { type: "new"; file: File; url: string };

  const [coverItems, setCoverItems] = React.useState<CoverItem[]>(() => {
    const keys = initial.coverKeys || [];
    const urls = initial.signedCoverUrls || [];
    return keys.map((k, i) => ({ type: "existing", key: k, url: urls[i] || supabase.storage.from('hack-covers').getPublicUrl(k).data.publicUrl }));
  });
  const [coversBaseline, setCoversBaseline] = React.useState<{ keys: string[]; urls: string[] }>(() => ({
    keys: initial.coverKeys || [],
    urls: (initial.signedCoverUrls || []).slice(),
  }));
  const [saving, setSaving] = React.useState(false);

  const urlLike = (s: string) => !s || /^https?:\/\//i.test(s);

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

  const platformEntry = React.useMemo(() => baseRoms.find(r => r.id === baseRom), [baseRom]);
  const allowedSizes = platformEntry ? getAllowedSizesForPlatform(platformEntry.platform) : [];
  const overLimit = coverItems.length > MAX_COVERS;

  // Change detection helpers
  const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const tagsChanged = !arraysEqual(tags, baseline.tags);
  const titleChanged = title !== baseline.title;
  const summaryChanged = summary !== baseline.summary;
  const descriptionChanged = description !== baseline.description;
  const languageChanged = language !== baseline.language;
  const boxArtChanged = boxArt !== baseline.boxArt;
  const discordChanged = discord !== baseline.discord;
  const twitterChanged = twitter !== baseline.twitter;
  const pokeChanged = pokecommunity !== baseline.pokecommunity;
  const contentChanged = titleChanged || summaryChanged || descriptionChanged || languageChanged || boxArtChanged || tagsChanged || discordChanged || twitterChanged || pokeChanged;

  const newItemsCount = coverItems.filter((i) => i.type === "new").length;
  const currentExistingKeys = coverItems.filter((i): i is { type: "existing"; key: string; url: string } => i.type === "existing").map((i) => i.key);
  const coversChanged = newItemsCount > 0 || !arraysEqual(currentExistingKeys, coversBaseline.keys);

  function removeAt(index: number) {
    setCoverItems((prev) => prev.filter((_, i) => i !== index));
  }

  function onReorder(oldIndex: number, newIndex: number) {
    setCoverItems((prev) => {
      const copy = prev.slice();
      const [moved] = copy.splice(oldIndex, 1);
      copy.splice(newIndex, 0, moved);
      return copy;
    });
  }

  function onAddFiles(files: File[]) {
    const platform = platformEntry?.platform;
    const sizes = platform ? getAllowedSizesForPlatform(platform) : [];
    const doValidate = async () => {
      const accepted: CoverItem[] = [];
      for (const f of files) {
        if (sizes.length === 0) {
          accepted.push({ type: "new", file: f, url: URL.createObjectURL(f) });
          continue;
        }
        const ok = await validateImageDimensions(f, sizes);
        if (ok) {
          accepted.push({ type: "new", file: f, url: URL.createObjectURL(f) });
        }
      }
      setCoverItems((prev) => [...prev, ...accepted]);
    };
    void doValidate();
  }

  async function onSaveMeta() {
    setSaving(true);
    try {
      const social = discord || twitter || pokecommunity ? { discord: discord || undefined, twitter: twitter || undefined, pokecommunity: pokecommunity || undefined } : null;
      const updateArgs: any = { slug };
      if (titleChanged) updateArgs.title = title.trim();
      if (summaryChanged) updateArgs.summary = summary.trim();
      if (descriptionChanged) updateArgs.description = description.trim();
      if (languageChanged) updateArgs.language = language;
      if (boxArtChanged) updateArgs.box_art = boxArt ? boxArt.trim() : null;
      if (tagsChanged) updateArgs.tags = tags.slice();
      if (discordChanged || twitterChanged || pokeChanged) updateArgs.social_links = social; // may be null to clear

      const { ok, error } = await updateHack(updateArgs);
      if (!ok) throw new Error(error || "Save failed");
      // Update baseline on success to clear modified indicators
      setBaseline({
        title,
        summary,
        description,
        language,
        boxArt,
        tags: tags.slice(),
        discord,
        twitter,
        pokecommunity,
      });
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCovers() {
    setSaving(true);
    try {
      // Upload any new files and build final key order
      const keys: string[] = [];
      for (let i = 0; i < coverItems.length; i++) {
        const item = coverItems[i];
        if (item.type === "existing") {
          keys.push(item.key);
        } else {
          const ext = item.file.name.split('.').pop();
          const path = `${slug}/${Date.now()}-${i}.${ext}`;
          const { error } = await supabase.storage.from('hack-covers').upload(path, item.file);
          if (error) throw error;
          keys.push(path);
        }
      }
      // Persist cover ordering/rows first
      const saved = await saveHackCovers({ slug, coverUrls: keys });
      if (!saved.ok) throw new Error(saved.error || 'Failed to save covers');
      // Transform any new items into existing with their new keys
      setCoverItems((prev) => prev.map((item, i) => item.type === "existing" ? item : { type: "existing", key: keys[i], url: item.url }));
      // Update covers baseline to newly saved order/keys and keep current preview URLs
      setCoversBaseline({ keys, urls: coverItems.map((c) => c.url) });
    } catch (e: any) {
      alert(e.message || "Failed to save covers");
    } finally {
      setSaving(false);
    }
  }

  const summaryLimit = 120;
  const summaryTooLong = summary.length > summaryLimit;
  const contentHasErrors = summaryTooLong || (!!boxArt && !urlLike(boxArt));

  return (
    <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Content</h2>
              <div className="flex items-center gap-3">
              {contentChanged && (
                <button
                  type="button"
                  onClick={() => { setTitle(baseline.title); setSummary(baseline.summary); setDescription(baseline.description); setLanguage(baseline.language); setBoxArt(baseline.boxArt); setTags(baseline.tags.slice()); setDiscord(baseline.discord); setTwitter(baseline.twitter); setPokecommunity(baseline.pokecommunity); }}
                    className="inline-flex items-center underline underline-offset-2 text-[12px] font-semibold cursor-pointer"
                >
                  Revert all
                </button>
              )}
              <button onClick={onSaveMeta} disabled={saving || !contentChanged || contentHasErrors} className="shine-wrap btn-premium h-8 min-w-[6rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]">
                <span>{saving ? "Saving…" : "Save Content/Details"}</span>
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Title</label>
                {titleChanged && (
                  <div className="flex items-center gap-2 text-[11px] text-foreground/70">
                    <span>Modified</span>
                    <button type="button" onClick={() => setTitle(baseline.title)} className="inline-flex items-center underline underline-offset-2 text-[11px] cursor-pointer">Revert</button>
                  </div>
                )}
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${titleChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`} />
            </div>
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Summary</label>
                <div className="flex items-center gap-2">
                  {summaryChanged && (
                    <>
                      <span className="text-[11px] text-foreground/70 ml-2">Modified</span>
                      <button type="button" onClick={() => setSummary(baseline.summary)} className="inline-flex items-center underline underline-offset-2 text-[11px] cursor-pointer">Revert</button>
                    </>
                  )}
                </div>
              </div>
              <div className="relative w-full">
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className={`w-full h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 pr-16 ${summary.length > summaryLimit ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : summaryChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] ${summary.length > summaryLimit ? "text-red-300" : "text-foreground/60"}`}>
                  {summary.length}/{summaryLimit}
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Description</label>
                <div className="flex items-center gap-1 text-xs">
                  <button type="button" onClick={() => setShowMdPreview(false)} className={`px-2 py-1 rounded ${!showMdPreview ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : "text-foreground/70"}`}>Write</button>
                  <button type="button" onClick={() => setShowMdPreview(true)} className={`px-2 py-1 rounded ${showMdPreview ? "bg-[var(--surface-2)] ring-1 ring-[var(--border)]" : "text-foreground/70"}`}>Preview</button>
                  {descriptionChanged && (
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-[11px] text-foreground/70">Modified</span>
                      <button type="button" onClick={() => setDescription(baseline.description)} className="inline-flex items-center underline underline-offset-2 text-[11px] cursor-pointer">Revert</button>
                    </div>
                  )}
                </div>
              </div>
              {!showMdPreview ? (
                <textarea
                  rows={14}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Supports Markdown"
                  className={`rounded-md px-3 py-2 min-h-[14rem] text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${descriptionChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`}
                />
              ) : (
                <div className={`prose max-w-none rounded-md min-h-[14rem] px-3 py-2 ring-1 ring-inset ${descriptionChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'} ${description ? "" : "text-foreground/60 text-sm"}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{description || "Nothing to preview yet."}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Tags</label>
                {tagsChanged && (
                  <div className="flex items-center gap-2 text-[11px] text-foreground/70">
                    <span>Modified</span>
                    <button type="button" onClick={() => setTags(baseline.tags.slice())} className="inline-flex items-center underline underline-offset-2 text-[11px] cursor-pointer">Revert</button>
                  </div>
                )}
              </div>
              <div className={`rounded-md ring-1 ring-inset ${tagsChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'ring-transparent'} p-1`}>
                <TagSelector value={tags} onChange={setTags} />
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Screenshots</h2>
              <div className="flex items-center gap-2">
                {coversChanged && (
                  <button type="button" onClick={() => setCoverItems(coversBaseline.keys.map((k, i) => ({ type: 'existing' as const, key: k, url: coversBaseline.urls[i] || supabase.storage.from('hack-covers').getPublicUrl(k).data.publicUrl })))} className="inline-flex h-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[12px] cursor-pointer">
                    Revert
                  </button>
                )}
                <button onClick={onSaveCovers} disabled={saving || !coversChanged || overLimit} className="inline-flex shine-wrap btn-premium h-8 min-w-[6rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]">
                  <span>{saving ? "Saving…" : "Save images"}</span>
                </button>
              </div>
            </div>
          <div className="mt-4 grid gap-4">
            {allowedSizes.length > 0 && (
              <p className="text-xs text-foreground/60">Allowed sizes: {allowedSizes.map((s) => `${s.w}x${s.h}`).join(", ")}</p>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onAddFiles(Array.from(e.target.files || []))}
              className="w-full rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none"
            />

            {coverItems.length === 0 ? (
              <p className="text-sm text-foreground/70">No screenshots yet.</p>
            ) : (
              <SortableCovers
                items={coverItems.map((item, i) => ({
                  id: item.type === 'existing' ? `e:${(item as any).key}` : `n:${(item as any).file.name}-${i}`,
                  url: item.url,
                  filename: item.type === 'existing' ? item.key.split('/').pop() || `Cover ${i+1}` : (item as any).file.name,
                  isNew: item.type === 'new'
                }))}
                onReorder={onReorder}
                onRemove={removeAt}
              />
            )}

            <div className="text-xs text-foreground/60 flex justify-between">
              <p>Images: <span className={overLimit ? "text-red-300 font-bold" : "text-foreground/60"}>{coverItems.length}</span>/{MAX_COVERS}</p>
              {overLimit && <p className="text-red-300/80 italic">Remove some to save.</p>}
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-6 self-start w-full lg:w-auto">
        <div className="card p-5">
          <h3 className="text-[15px] font-semibold tracking-tight">Details</h3>
          <div className="mt-3 grid gap-3 text-sm">
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Base ROM</label>
              <p className="flex items-center h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-foreground/60 select-none cursor-not-allowed">
                {baseRoms.find(r => r.id === baseRom)?.name || baseRom}
              </p>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground/80">Language</label>
                {languageChanged && (
                  <div className="ml-auto flex items-center gap-2 text-[11px] text-foreground/70">
                    <span>Modified</span>
                    <button type="button" onClick={() => setLanguage(baseline.language)} className="inline-flex items-center underline underline-offset-2 text-[11px] cursor-pointer">Revert</button>
                  </div>
                )}
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${languageChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`}>
                {['English','Spanish','French','German','Italian','Portuguese','Japanese','Chinese','Korean','Other'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Current version</label>
              <p className="flex items-center h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] text-foreground/60 select-none cursor-not-allowed">
                {version}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Box art URL</label>
              <div className="flex items-center justify-between">
                <input value={boxArt} onChange={(e) => setBoxArt(e.target.value)} placeholder="https://..." className={`flex-1 h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${boxArt && !urlLike(boxArt) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : boxArtChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`} />
                {boxArtChanged && (
                  <button type="button" onClick={() => setBoxArt(baseline.boxArt)} className="ml-3 text-[11px] underline underline-offset-2 cursor-pointer">Revert</button>
                )}
              </div>
              {boxArt && urlLike(boxArt) && (
                <div className="relative aspect-square w-full max-h-[300px] overflow-hidden rounded ring-1 ring-[var(--border)]">
                  <Image src={boxArt} alt="Box art preview" fill className="object-contain" unoptimized />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-foreground/80">Social links</label>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="Discord invite URL" className={`flex-1 h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${discord && !urlLike(discord) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : discordChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`} />
                  {discordChanged && <button type="button" onClick={() => setDiscord(baseline.discord)} className="text-[11px] underline underline-offset-2 cursor-pointer">Revert</button>}
                </div>
                <div className="flex items-center gap-2">
                  <input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="Twitter/X profile URL" className={`flex-1 h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${twitter && !urlLike(twitter) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : twitterChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`} />
                  {twitterChanged && <button type="button" onClick={() => setTwitter(baseline.twitter)} className="text-[11px] underline underline-offset-2 cursor-pointer">Revert</button>}
                </div>
                <div className="flex items-center gap-2">
                  <input value={pokecommunity} onChange={(e) => setPokecommunity(e.target.value)} placeholder="PokeCommunity thread URL" className={`flex-1 h-11 rounded-md px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 ${pokecommunity && !urlLike(pokecommunity) ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : pokeChanged ? 'ring-[var(--ring)] bg-[var(--surface-2)]' : 'bg-[var(--surface-2)] ring-[var(--border)]'}`} />
                  {pokeChanged && <button type="button" onClick={() => setPokecommunity(baseline.pokecommunity)} className="text-[11px] underline underline-offset-2 cursor-pointer">Revert</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}



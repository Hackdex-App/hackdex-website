"use client";

import React, { Fragment } from "react";
import HackCard from "@/components/HackCard";
import { createClient } from "@/utils/supabase/client";
import { baseRoms } from "@/data/baseRoms";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { useFloating, offset, flip, shift, size, autoUpdate } from "@floating-ui/react";
import { IconType } from "react-icons";
import { MdTune } from "react-icons/md";
import { BsSdCardFill } from "react-icons/bs";
import { CATEGORY_ICONS } from "@/components/Icons/tagCategories";


export default function DiscoverBrowser() {
  const supabase = createClient();
  const [query, setQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [selectedBaseRoms, setSelectedBaseRoms] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState("popular");
  const [hacks, setHacks] = React.useState<any[]>([]);
  const [tagGroups, setTagGroups] = React.useState<Record<string, string[]>>({});
  const [ungroupedTags, setUngroupedTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    const run = async () => {
      let orderBy: string | undefined = undefined;
      if (sort === "popular") {
        orderBy = "downloads";
      } else if (sort === "updated") {
        orderBy = "updated_at";
      } else {
        orderBy = "created_at";
      }

      const { data: rows } = await supabase
        .from("hacks")
        .select("slug,title,summary,description,base_rom,version,downloads,created_by,patch_url,updated_at")
        .order(orderBy, { ascending: false });
      const slugs = (rows || []).map((r) => r.slug);
      const { data: coverRows } = await supabase
        .from("hack_covers")
        .select("hack_slug,url,position")
        .in("hack_slug", slugs)
        .order("position", { ascending: true });
      const coversBySlug = new Map<string, string[]>();
      if (coverRows && coverRows.length > 0) {
        const { data: imagesData } = await supabase.storage
          .from('hack-covers')
          .createSignedUrls(coverRows.map(c => c.url), 60 * 5);
        if (imagesData) {
          // Map: storage object url -> signedUrl
          const urlToSignedUrl = new Map<string, string>();
          imagesData.forEach((d, idx) => {
            // If creation fails, d.signedUrl might be undefined; filter those out
            if (d.signedUrl) urlToSignedUrl.set(coverRows[idx].url, d.signedUrl);
          });

          coverRows.forEach((c) => {
            const arr = coversBySlug.get(c.hack_slug) || [];
            const signed = urlToSignedUrl.get(c.url);
            if (signed) {
              arr.push(signed);
              coversBySlug.set(c.hack_slug, arr);
            }
          });
        }
      }
      const { data: tagRows } = await supabase
        .from("hack_tags")
        .select("hack_slug,tags(name,category)")
        .in("hack_slug", slugs);
      const tagsBySlug = new Map<string, string[]>();
      (tagRows || []).forEach((r: any) => {
        if (!r.tags?.name) return;
        const arr = tagsBySlug.get(r.hack_slug) || [];
        arr.push(r.tags.name);
        tagsBySlug.set(r.hack_slug, arr);
      });
      // Fetch all tags with category to build UI groups
      const { data: allTagRows } = await supabase
        .from("tags")
        .select("name,category");
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username");
      const usernameById = new Map<string, string>();
      (profiles || []).forEach((p) => usernameById.set(p.id, p.username ? `@${p.username}` : "Unknown"));

      const mapped = (rows || []).map((r) => ({
        slug: r.slug,
        title: r.title,
        author: usernameById.get(r.created_by as string) || "Unknown",
        covers: coversBySlug.get(r.slug) || [],
        tags: tagsBySlug.get(r.slug) || [],
        downloads: r.downloads,
        baseRomId: r.base_rom,
        version: r.version,
        summary: r.summary,
        description: r.description,
      }));

      setHacks(mapped);
      if (allTagRows) {
        const groups: Record<string, string[]> = {};
        const ungrouped: string[] = [];
        const unique = new Set<string>();
        // Build groups from authoritative tags table, so we include tags not present in current results too
        for (const row of allTagRows as any[]) {
          const name: string = row.name;
          if (unique.has(name)) continue;
          unique.add(name);
          const category: string | null = row.category ?? null;
          if (category) {
            if (!groups[category]) groups[category] = [];
            groups[category].push(name);
          } else {
            ungrouped.push(name);
          }
        }
        // Sort for stable UI
        Object.keys(groups).forEach((k) => groups[k].sort((a, b) => a.localeCompare(b)));
        ungrouped.sort((a, b) => a.localeCompare(b));
        setTagGroups(groups);
        setUngroupedTags(ungrouped);
      }
    };
    run();
  }, [sort]);

  const filtered = React.useMemo(() => {
    let out = hacks;
    const q = query.toLowerCase();
    if (q) {
      out = out.filter((h) =>
        h.title.toLowerCase().includes(q) ||
        h.author.toLowerCase().includes(q) ||
        (h.description || "").toLowerCase().includes(q)
      );
    }
    // AND filter across selected tags: hack must include all selectedTags
    if (selectedTags.length > 0) {
      out = out.filter((h) => selectedTags.every((t) => h.tags.includes(t)));
    }
    // OR filter across base roms: hack's baseRomId must be in selectedBaseRoms
    if (selectedBaseRoms.length > 0) {
      out = out.filter((h) => selectedBaseRoms.includes(h.baseRomId));
    }
    return out;
  }, [hacks, query, selectedTags, selectedBaseRoms]);

  function toggleTag(name: string) {
    setSelectedTags((prev) => (prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]));
  }

  function clearTags() {
    setSelectedTags([]);
  }

  function toggleBaseRom(id: string) {
    setSelectedBaseRoms((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function clearBaseRoms() {
    setSelectedBaseRoms([]);
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or keyword"
            className="h-11 w-full rounded-md bg-[var(--surface-2)] px-3 text-sm text-foreground placeholder:text-foreground/60 ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          <option value="popular">Most popular</option>
          <option value="new">Newest</option>
          <option value="updated">Recently updated</option>
        </select>
      </div>

      {/* Unified filter section: Base ROM dropdown first, category dropdowns next, ungrouped tags last */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <MultiSelectDropdown
          icon={BsSdCardFill}
          label="Base ROM"
          options={baseRoms.map((b) => ({ id: b.id, name: b.name }))}
          values={selectedBaseRoms}
          onChange={setSelectedBaseRoms}
        />
        {Object.keys(tagGroups)
          .sort((a, b) => a.localeCompare(b))
          .map((cat) => (
            <MultiSelectDropdown
              key={cat}
              icon={CATEGORY_ICONS[cat]}
              label={cat}
              options={tagGroups[cat].map((t) => ({ id: t, name: t }))}
              values={selectedTags.filter((t) => tagGroups[cat].includes(t))}
              onChange={(vals) => {
                // Replace selections for this category while keeping others
                setSelectedTags((prev) => {
                  const others = prev.filter((t) => !tagGroups[cat].includes(t));
                  return [...others, ...vals];
                });
              }}
            />
          ))}
        {/* Advanced dropdown for ungrouped tags at the end */}
        {ungroupedTags.length > 0 && (
          <MultiSelectDropdown
            icon={MdTune}
            label="Advanced"
            options={ungroupedTags.map((t) => ({ id: t, name: t }))}
            values={selectedTags.filter((t) => ungroupedTags.includes(t))}
            onChange={(vals) => {
              setSelectedTags((prev) => {
                const others = prev.filter((t) => !ungroupedTags.includes(t));
                return [...others, ...vals];
              });
            }}
          />
        )}
        {(selectedTags.length > 0 || selectedBaseRoms.length > 0) && (
          <button
            onClick={() => {
              clearTags();
              clearBaseRoms();
            }}
            className="ml-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((hack) => (
          <HackCard key={hack.slug} hack={hack} />
        ))}
      </div>
    </div>
  );
}

interface MultiSelectOption {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  icon?: IconType;
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
}

function MultiSelectDropdown({
  icon: Icon,
  label,
  options,
  values,
  onChange,
}: MultiSelectDropdownProps) {
  const { refs, floatingStyles, update } = useFloating({
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        apply({ availableWidth, elements }) {
          Object.assign(elements.floating.style, {
            maxWidth: `${Math.min(availableWidth, 420)}px`,
          });
        },
      }),
    ],
  });
  React.useEffect(() => {
    const reference = refs.reference.current;
    const floating = refs.floating.current;
    if (!reference || !floating) return;
    return autoUpdate(reference, floating, update);
  }, [refs.reference, refs.floating, update]);
  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((o) => map.set(o.id, o.name));
    return map;
  }, [options]);
  const selectedNames = values.map((v) => nameById.get(v) || v);
  const hasSelection = values.length > 0;
  return (
    <Listbox value={values} onChange={onChange} multiple>
      <div className="relative">
        <ListboxButton
          ref={refs.setReference}
          className={`flex max-w-[22rem] cursor-pointer select-none items-center gap-2 truncate rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors ${
            hasSelection
              ? "bg-[var(--accent)]/15 text-[var(--foreground)] ring-[var(--accent)]/35"
              : "bg-[var(--surface-2)] text-foreground/80 ring-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10"
          } data-open:ring-2 data-open:ring-[var(--ring)]`}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
          <span className="truncate">
            {selectedNames.length > 0 ? `${label}: ${selectedNames.join(", ")}` : label}
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions ref={refs.setFloating} style={floatingStyles} className="z-50 max-h-64 min-w-[14rem] overflow-auto rounded-md border border-[var(--border)] bg-white/70 dark:bg-zinc-800/70 backdrop-blur-xl p-1 shadow-lg focus:outline-none">
            {options.map((opt) => (
              <ListboxOption
                key={opt.id}
                value={opt.id}
                className={({ active }) =>
                  `cursor-pointer select-none rounded px-2 py-1 text-sm ${active ? "bg-black/5 dark:bg-white/10" : ""}`
                }
              >
                {({ selected }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={selected} className="h-4 w-4 accent-[var(--accent)]" />
                    <span className="text-foreground/90">{opt.name}</span>
                  </div>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
}



"use client";

import React from "react";
import Link from "next/link";
import { FiMaximize2 } from "react-icons/fi";
import PixelImage from "@/components/PixelImage";
import Lightbox from "@/components/Hack/Lightbox";

export interface HackVersionRow {
  id: number;
  version: string;
  createdAt: string;
  latest?: boolean;
}

interface HackTabsProps {
  slug: string;
  title: string;
  author: string;
  images: string[];
  /** Rendered markdown for the description. */
  about: React.ReactNode;
  /** Latest release notes, when the current patch has any. */
  changes?: { version: string; date: string; body: React.ReactNode } | null;
  versions: HackVersionRow[];
  baseRomName: string | null;
  /** Draft editing: replaces the About section (heading included) with the description editor. Stays mounted across tabs. */
  aboutPanel?: React.ReactNode;
  /** Draft editing: replaces the Gallery panel with the screenshot manager. Stays mounted across tabs. */
  gallery?: React.ReactNode;
  /** Draft editing: action row under the versions table, e.g. Upload a version. */
  versionsAction?: React.ReactNode;
}

const TAB_IDS = ["about", "gallery", "versions"] as const;
type TabId = (typeof TAB_IDS)[number];

/** About / Gallery / Versions for the hack page body. The lightbox is shared by both galleries. */
export default function HackTabs({ slug, title, author, images, about, changes, versions, baseRomName, aboutPanel, gallery, versionsAction }: HackTabsProps) {
  const [tab, setTab] = React.useState<TabId>("about");
  const [shot, setShot] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const tabsRef = React.useRef<HTMLDivElement | null>(null);
  const tabs = [
    { id: "about", label: "About" },
    { id: "gallery", label: "Gallery", count: images.length },
    { id: "versions", label: "Versions", count: versions.length },
  ] as const;

  const view = (i: number) => {
    setShot(i);
    setOpen(true);
  };
  const showVersions = () => {
    setTab("versions");
    tabsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* The tab strip sits 1px over the rule so the active underline replaces it; the scroller is outside so that overhang never becomes a scrollbar. */}
      <div ref={tabsRef} className="-mx-6 border-b border-line px-6 scroll-mt-[72px] md:mx-0 md:px-0">
        <div role="tablist" aria-label="Hack sections" className="-mb-px flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[15px] font-medium transition-colors ${
              tab === t.id ? "border-accent text-text" : "border-transparent text-text-2 hover:text-text"
            }`}
          >
            {t.label} {"count" in t && <small className="text-xs font-normal text-text-3">{t.count}</small>}
          </button>
        ))}
        </div>
      </div>

      {/* Editors stay mounted while hidden: unmounting them dropped staged edits when switching tabs. */}
      {(tab === "about" || aboutPanel) && (
        <div id="panel-about" role="tabpanel" aria-labelledby="tab-about" hidden={tab !== "about"} className="anim-fade flex flex-col gap-8">
          {images.length > 0 && (
            <section aria-label="Screenshots">
              <figure className="m-0 rounded-card bg-well p-3 md:p-4">
                <button type="button" onClick={() => view(shot)} aria-label="Open screenshot full size" className="group/stage relative mx-auto block w-full max-w-[720px] overflow-hidden rounded-frame">
                  <PixelImage src={images[shot]} alt={`${title} screenshot ${shot + 1} of ${images.length}`} mode="contain" className="aspect-[3/2] w-full" />
                  <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex translate-y-1 items-center gap-1.5 rounded-md bg-[rgba(13,16,23,.78)] px-2.5 py-1 text-xs font-medium text-white opacity-0 transition-[opacity,transform] duration-150 group-hover/stage:translate-y-0 group-hover/stage:opacity-100 group-focus-visible/stage:translate-y-0 group-focus-visible/stage:opacity-100">
                    <FiMaximize2 className="h-4 w-4" /> {shot + 1} of {images.length}
                  </span>
                </button>
              </figure>
              {images.length > 1 && (
                <div role="tablist" aria-label="Screenshots" className="-mx-6 mt-1.5 flex gap-2 overflow-x-auto px-6 py-1 [scrollbar-width:none] md:-mx-1 md:flex-wrap md:px-1">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={i === shot}
                      aria-label={`Screenshot ${i + 1}`}
                      onClick={() => setShot(i)}
                      className={`flex-none overflow-hidden rounded-frame transition-[opacity,box-shadow] duration-[120ms] ${i === shot ? "opacity-100 shadow-[0_0_0_2px_var(--rose)]" : "opacity-55 hover:opacity-90"}`}
                    >
                      <img src={src} alt="" width={120} height={80} loading="lazy" className="h-20 w-[120px] object-cover object-top" draggable={false} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {aboutPanel ?? (
            <section>
              <h2 className="mb-2.5 text-lg font-semibold leading-tight">About</h2>
              <div className="prose prose-sm max-w-[70ch] text-text-2">{about}</div>
            </section>
          )}

          {changes && (
            <section>
              <h2 className="mb-2.5 text-lg font-semibold leading-tight">
                What changed in {changes.version} <span className="ml-2 text-[13px] font-normal text-text-3">{changes.date}</span>
              </h2>
              <div className="prose prose-sm max-w-[70ch] text-text-2">{changes.body}</div>
              {versions.length > 1 && (
                <button type="button" className="text-link-hd mt-2 text-sm" onClick={showVersions}>
                  All {versions.length} versions
                </button>
              )}
            </section>
          )}
        </div>
      )}

      {gallery && (
        <div id="panel-gallery" role="tabpanel" aria-labelledby="tab-gallery" hidden={tab !== "gallery"} className="anim-fade">
          {gallery}
        </div>
      )}

      {tab === "gallery" && !gallery && (
        <div id="panel-gallery" role="tabpanel" aria-labelledby="tab-gallery" className="anim-fade flex flex-col gap-5">
          <p className="max-w-[70ch] text-sm text-text-2">
            {images.length === 0 ? `No screenshots yet from ${author}.` : `${images.length} screenshot${images.length === 1 ? "" : "s"} from ${author}. Open one to see it larger.`}
          </p>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(264px,1fr))]">
            {images.map((src, i) => (
              <li key={`${src}-${i}`}>
                <button
                  type="button"
                  onClick={() => view(i)}
                  aria-label={`Open screenshot ${i + 1} full size`}
                  className="flex w-full justify-center rounded-card bg-well p-3 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <img src={src} alt="" loading="lazy" className="aspect-[3/2] w-full max-w-[240px] rounded-frame object-cover object-top" draggable={false} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "versions" && (
        <div id="panel-versions" role="tabpanel" aria-labelledby="tab-versions" className="anim-fade flex flex-col gap-5">
          <p className="max-w-[70ch] text-sm text-text-2">Every version needs a clean {baseRomName ?? "base"} ROM.</p>
          {versions.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className="border-b border-line px-3 pb-2 text-left text-xs font-semibold text-text-3">Version</th>
                  <th scope="col" className="border-b border-line px-3 pb-2 text-left text-xs font-semibold text-text-3">Released</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td className="border-b border-line px-3 py-2.5">
                      <b className="font-semibold">{v.version}</b>
                      {v.latest && <span className="ml-2 text-xs font-medium text-link">Latest</span>}
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-text-2">{new Date(v.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-text-3">No versions yet.</p>
          )}
          {versionsAction}
          <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href={`/hack/${slug}/versions`} className="text-link-hd">
              Full version history
            </Link>
            <Link href={`/hack/${slug}/changelog`} className="text-link-hd">
              Changelog
            </Link>
          </p>
        </div>
      )}

      {open && images.length > 0 && <Lightbox images={images} index={shot} title={title} onChange={setShot} onClose={() => setOpen(false)} />}
    </div>
  );
}

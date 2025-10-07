"use client";

import React from "react";
import { FaTriangleExclamation } from "react-icons/fa6";
import { baseRoms } from "@/data/baseRoms";
import { useBaseRoms } from "@/contexts/BaseRomContext";
import BaseRomCard from "@/components/BaseRomCard";

export default function RomsInteractive() {
  const { supported, linked, statuses, cached, totalCachedBytes, importUploadedBlob, importToCache, removeFromCache, unlinkRom, ensurePermission, countReady } = useBaseRoms();
  const [uploadMsg, setUploadMsg] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = await importUploadedBlob(file);
    if (name) setUploadMsg(`Recognized and cached: ${name}`);
    else setUploadMsg("Unrecognized ROM. Not cached.");
    e.target.value = "";
  }

  const linkedOrCached = baseRoms.filter(({ name }) => Boolean(cached[name]) || Boolean(linked[name]));
  const notLinked = baseRoms.filter(({ name }) => !cached[name] && !linked[name]);

  return (
    <>
      {!supported && (
        <div className="mt-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          Your browser may not support local file linking for large ROMs. Try Chrome or Edge on desktop if you have issues.
        </div>
      )}

      <div className="mt-6 grid gap-3 text-sm text-foreground/70">
        <div
          className={`rounded-md border-2 border-dashed p-6 sm:p-8 min-h-[140px] ${
            dragActive
              ? "border-[var(--accent)] bg-[var(--accent)]/8 ring-2 ring-[var(--accent)]/30"
              : "border-[var(--border)] bg-[var(--surface-2)]"
          }`}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const file = e.dataTransfer?.files?.[0];
            if (!file) return;
            const name = await importUploadedBlob(file);
            if (name) setUploadMsg(`Recognized and cached: ${name}`);
            else setUploadMsg("Unrecognized ROM. Not cached.");
          }}
        >
          <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-start gap-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-foreground/70">
                <path d="M12 16v-8m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div>
                <div className="text-[14px] font-medium">Drag & drop a base ROM here</div>
                <p className="mt-1 text-xs text-foreground/70">Or click to choose a file. Recognized ROMs are cached locally and never uploaded.</p>
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-700)]">
              <input type="file" onChange={onUpload} className="hidden" />
              Choose file…
            </label>
          </div>
          {uploadMsg && <div className="mt-2 text-xs text-foreground/70">{uploadMsg}</div>}
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-foreground/70">
          <FaTriangleExclamation size={16} className="inline-block mr-1 text-foreground/30" /> Files are processed locally in your browser and never uploaded.</div>
        <div>Cached size: {(totalCachedBytes / (1024 * 1024)).toFixed(1)} MB</div>
      </div>

      {linkedOrCached.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/70">Linked or cached</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {linkedOrCached.map(({ name, platform, region }) => {
              const isLinked = Boolean(linked[name]);
              const status = statuses[name] ?? (isLinked ? "prompt" : "denied");
              const isCached = Boolean(cached[name]);
              return (
                <BaseRomCard
                  key={name}
                  name={name}
                  platform={platform}
                  region={region}
                  isLinked={isLinked}
                  status={status}
                  isCached={isCached}
                  onRemoveCache={() => removeFromCache(name)}
                  onUnlink={() => unlinkRom(name)}
                  onEnsurePermission={() => ensurePermission(name, true)}
                  onImportCache={() => importToCache(name)}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/70">Not linked</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notLinked.map(({ name, platform, region }) => (
            <BaseRomCard
              key={name}
              name={name}
              platform={platform}
              region={region}
              isLinked={false}
              status={"denied"}
              isCached={false}
            />
          ))}
        </div>
      </div>
    </>
  );
}



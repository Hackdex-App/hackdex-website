"use client";

import React from "react";
import Link from "next/link";
import { FiExternalLink, FiEdit2, FiUpload, FiShare2, FiBarChart2, FiMoreVertical, FiCheck } from "react-icons/fi";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import ActionSheet from "@/components/Primitives/ActionSheet";

type HackRow = {
  slug: string;
  title: string;
  approved: boolean;
  updated_at: string | null;
  downloads: number;
  version: string;
};

export default function HackList({ hacks }: { hacks: HackRow[] }) {
  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  if (hacks.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-6 text-sm text-foreground/80">
        You haven&apos;t uploaded any hacks yet. <Link className="underline" href="/submit">Submit a hack</Link> to get started.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
      {/* Header row (desktop only) */}
      <div className="hidden lg:grid grid-cols-12 bg-[var(--surface-2)] px-4 py-2 text-xs text-foreground/60">
        <div className="col-span-4">Title</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Version</div>
        <div className="col-span-2">Downloads</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {hacks.map((h) => (
          <div key={h.slug} className="px-4 py-3 text-sm">
            {/* Desktop row */}
            <div className="hidden lg:grid grid-cols-12 items-center">
              <Link href={`/hack/${h.slug}`} target="_blank" className="group flex items-center gap-4 col-span-4 min-w-0 hover:text-foreground">
                <div className="flex flex-col items-start">
                  <div className="truncate font-medium group-hover:underline">{h.title}</div>
                  <div className="mt-0.5 text-xs text-foreground/60 group-hover:text-foreground group-hover:underline">/{h.slug}</div>
                </div>
                <FiExternalLink className="h-4 w-4 text-foreground/80 group-hover:text-foreground" />
              </Link>
              <div className="col-span-2">
                {h.approved ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 ring-1 ring-emerald-600/30">Approved</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 ring-1 ring-amber-600/30">Pending</span>
                )}
              </div>
              <div className="col-span-2">{h.version}</div>
              <div className="col-span-2">{h.downloads}</div>
              <div className="col-span-2 hidden md:flex items-center justify-end gap-1.5">
                <IconTooltipButton href={`/hack/${h.slug}/stats`} target="_blank" label="Stats">
                  <FiBarChart2 className="h-4 w-4" />
                </IconTooltipButton>
                <IconTooltipButton href={`/hack/${h.slug}/edit`} label="Edit">
                  <FiEdit2 className="h-4 w-4" />
                </IconTooltipButton>
                <IconTooltipButton href={`/hack/${h.slug}/edit/patch`} label="Upload patch">
                  <FiUpload className="h-4 w-4" />
                </IconTooltipButton>
                <ShareIconButton slug={h.slug} />
              </div>
            </div>
            {/* Mobile card */}
            <div className="lg:hidden flex justify-between items-center">
              <div className="flex flex-col items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium break-words">{h.title}</div>
                  <div className="mt-0.5 text-xs text-foreground/60 break-all">/{h.slug}</div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {h.approved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 ring-1 ring-emerald-600/30">Approved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-400 ring-1 ring-amber-600/30">Pending</span>
                  )}
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 ring-1 ring-[var(--border)]">{h.version}</span>
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 ring-1 ring-[var(--border)]">{h.downloads} downloads</span>
                </div>
              </div>
              <IconTooltipButton onClick={() => { setActiveSlug(h.slug); setSheetOpen(true); }} label="More" ariaLabel="More">
                <FiMoreVertical className="h-4 w-4" />
              </IconTooltipButton>
            </div>
          </div>
        ))}
      </div>
      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={activeSlug ? `Actions for ${activeSlug}` : undefined}
        actions={buildActions(activeSlug)}
      />
    </div>
  );
}

function ShareIconButton({ slug }: { slug: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleClick = async () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/hack/${slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <IconTooltipButton onClick={handleClick} label={copied ? "Copied!" : "Share link"} ariaLabel="Share link">
      {copied ? <FiCheck className="h-4 w-4 text-emerald-400/80" /> : <FiShare2 className="h-4 w-4" />}
    </IconTooltipButton>
  );
}

function buildActions(slug: string | null) {
  if (!slug) return [];
  return [
    { key: "view", label: "View", href: `/hack/${slug}`, icon: <FiExternalLink className="h-4 w-4" /> },
    { key: "stats", label: "Stats", href: `/hack/${slug}/stats`, icon: <FiBarChart2 className="h-4 w-4" /> },
    { key: "edit", label: "Edit", href: `/hack/${slug}/edit`, icon: <FiEdit2 className="h-4 w-4" /> },
    { key: "upload", label: "Upload patch", href: `/hack/${slug}/edit/patch`, icon: <FiUpload className="h-4 w-4" /> },
    { key: "share", label: "Share link", onClick: () => copyShare(slug), icon: <FiShare2 className="h-4 w-4" /> },
  ];
}

async function copyShare(slug: string) {
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/hack/${slug}`;
    await navigator.clipboard.writeText(url);
  } catch {}
}

type IconTooltipButtonProps = {
  href: string;
  target?: string;
  onClick?: never;
  label: string;
  ariaLabel?: string;
  children: React.ReactNode;
} | {
  href?: never;
  target?: never;
  onClick: () => void;
  label: string;
  ariaLabel?: string;
  children: React.ReactNode;
};
function IconTooltipButton({ href, target, onClick, label, ariaLabel, children }: IconTooltipButtonProps) {
  return (
    <Tooltip label={label}>
      {href ? (
        <Link
          href={href}
          target={target}
          aria-label={ariaLabel ?? label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        >
          {children}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel ?? label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        >
          {children}
        </button>
      )}
    </Tooltip>
  );
}

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { refs, floatingStyles, update } = useFloating({
    placement: "top",
    middleware: [offset(6), flip(), shift()],
  });

  React.useEffect(() => {
    const ref = refs.reference.current;
    const float = refs.floating.current;
    if (!ref || !float) return;
    return autoUpdate(ref, float, update);
  }, [refs.reference, refs.floating, update]);

  return (
    <span
      className="relative inline-flex"
      ref={refs.setReference as any}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          ref={refs.setFloating as any}
          style={floatingStyles as React.CSSProperties}
          className="hidden lg:block z-50 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-md dark:bg-white/90 dark:text-black"
          role="tooltip"
        >
          {label}
        </span>
      )}
    </span>
  );
}



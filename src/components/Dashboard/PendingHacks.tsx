"use client";

import React from "react";
import Link from "next/link";
import type { HackRow } from "./DashboardClient";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";
import { FaCircleCheck } from "react-icons/fa6";

export type PendingHack = HackRow & {
  created_by: string;
  creator_username: string | null;
  creator_full_name: string | null;
  creator_email: string | null;
  creator_verified: boolean;
  assigned_admin: string | null;
}

interface PendingHacksProps {
  hacks: PendingHack[];
}

export default function PendingHacks({ hacks }: PendingHacksProps) {
  if (hacks.length === 0) {
    return (
      <PendingHacksContainer count={0}>
        <div className="flex items-center justify-center text-foreground/80 my-4">
          No pending hacks to review! 🎉
        </div>
      </PendingHacksContainer>
    )
  }

  return (
    <PendingHacksContainer count={hacks.length}>
      {/* Header row (desktop only) */}
      <div className="hidden lg:grid grid-cols-12 bg-amber-500/5 px-4 py-2 text-xs text-amber-900/80 dark:text-amber-200/80">
        <div className="col-span-4">Title</div>
        <div className="col-span-4">Creator</div>
        <div className="col-span-4">Created</div>
      </div>
      <div className="divide-y divide-amber-600/20">
        {hacks.map((h) => {
          return <PendingHackCard key={h.slug} hack={h} />;
        })}
      </div>
    </PendingHacksContainer>
  );
}

function PendingHacksContainer({ count, children }: { count: number, children: React.ReactNode }) {
  return (
    <div className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-xl font-semibold">Pending hacks</h2>
        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-sm font-medium text-amber-900/90 dark:bg-amber-500/20 dark:text-amber-100 border border-amber-600/30">
          {count}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-amber-600/30 bg-amber-500/5">
        {children}
      </div>
    </div>
  );
}

function PendingHackCard({ hack }: { hack: PendingHack }) {
  const createdDate = hack.created_at
    ? new Date(hack.created_at).toLocaleTimeString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";
  const creator = hack.creator_username ? `@${hack.creator_username}` : "Unknown";
  const hasMissingPatch = hack.current_patch === null;
  const bgClasses = hasMissingPatch
    ? "bg-amber-50/5 dark:bg-amber-900/5 hover:bg-amber-400/10 dark:hover:bg-amber-600/10"
    : "bg-amber-500/5 hover:bg-amber-500/10";

  return (
    <Link
      key={hack.slug}
      href={`/hack/${hack.slug}`}
      target="_blank"
      className={`group block px-4 py-3 text-sm ${bgClasses} transition-colors`}
    >
      {/* Desktop row */}
      <div className="hidden lg:grid grid-cols-12 items-center">
        <div className="col-span-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="truncate font-medium text-amber-900/90 dark:text-amber-200/90 group-hover:underline">{hack.title}</div>
                {hasMissingPatch && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-amber-600/20 dark:bg-amber-600/40 px-2 py-0.5 text-xs font-medium text-amber-900/90 dark:text-amber-200/90">
                    <FiAlertTriangle className="h-3 w-3 text-amber-900/90 dark:text-amber-200/90" />
                    <span>Missing Patch</span>
                  </div>
                )}
              </div>
              <div className="mt-0.5 text-xs text-amber-900/60 dark:text-amber-200/60 group-hover:underline">/{hack.slug}</div>
            </div>
          </div>
        </div>
        <div className="col-span-4 flex flex-col min-w-0">
          {hack.creator_full_name && <div className="text-xs text-amber-900/70 dark:text-amber-200/70">{hack.creator_full_name}</div>}
          <div className="text-amber-900/90 dark:text-amber-200/90">
            {creator}
            {hack.creator_verified && (
              <div className="group/verified relative inline-flex items-center group ml-1">
                <FaCircleCheck className="text-amber-950/90 dark:text-amber-100/90" size={12} />
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover/verified:block group-hover/verified:opacity-100">
                  Creator is verified
                </div>
              </div>
            )}
          </div>
          {hack.creator_email && (
            <div className="text-xs text-amber-900/60 dark:text-amber-200/60 truncate mt-0.5">{hack.creator_email}</div>
          )}
        </div>
        <div className="col-span-4 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-amber-900/90 dark:text-amber-200/90 flex-1">{createdDate}</div>
            <FiExternalLink className="h-4 w-4 text-amber-900/90 dark:text-amber-200/90 flex-shrink-0" />
          </div>
        </div>
      </div>
      {/* Mobile card */}
      <div className="lg:hidden flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium wrap-break-word">{hack.title}</div>
              {hasMissingPatch && (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-600/20 dark:bg-amber-600/40 px-2 py-0.5 text-xs font-medium text-amber-900/90 dark:text-amber-200/90">
                  <FiAlertTriangle className="h-3 w-3 text-amber-900/90 dark:text-amber-200/90" />
                  <span>Missing Patch</span>
                </div>
              )}
            </div>
            <div className="mt-0.5 text-xs text-foreground/60 break-all">/{hack.slug}</div>
            <div className="flex flex-col gap-1 text-xs text-amber-900/90 dark:text-amber-200/90 mt-2">
              {(hack.creator_full_name || hack.creator_email) && (
                <div className="text-amber-900/70 dark:text-amber-200/70 break-all flex flex-wrap items-center gap-2">
                  {hack.creator_full_name && <span>{hack.creator_full_name}</span>}
                  {hack.creator_full_name && hack.creator_email && <span>•</span>}
                  {hack.creator_email && <span>{hack.creator_email}</span>}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <span>{creator}</span>
                <span>•</span>
                <span>{createdDate}</span>
              </div>
            </div>
          </div>
          <FiExternalLink className="h-4 w-4 text-foreground/80 flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}

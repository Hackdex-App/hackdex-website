"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import type { HackRow } from "./DashboardClient";
import { FiAlertTriangle, FiExternalLink } from "react-icons/fi";
import { FaCircleCheck, FaRegCircle, FaUserCheck } from "react-icons/fa6";
import { assignHacksToAdminForReview } from "@/app/dashboard/actions";
import { useRouter } from "next/navigation";

export type PendingHack = Omit<HackRow, "needsAiLabel"> & {
  created_by: string;
  creator_username: string | null;
  creator_full_name: string | null;
  creator_email: string | null;
  creator_verified: boolean;
  assigned_admin: string | null;
  assigned_admin_username: string | null;
}

interface PendingHacksProps {
  hacks: PendingHack[];
  userId: string;
}

type Filter =
  "unassigned" |
  "assigned_to_me" |
  "recent" |
  "all";

export default function PendingHacks({ hacks, userId }: PendingHacksProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("unassigned");
  const [claimMode, _setClaimMode] = useState<boolean>(false);
  const [selectedHacks, setSelectedHacks] = useState<PendingHack[]>([]);
  const [lastClaimedCount, setLastClaimedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const filteredHacks = React.useMemo(() => {
    let filtered = hacks;
    if (filter === "assigned_to_me") {
      filtered = filtered.filter((h) => h.assigned_admin && h.assigned_admin === userId);
    } else if (filter === "unassigned") {
      filtered = filtered.filter((h) => h.assigned_admin === null);
    } else if (filter === "recent") {
      // From within the last 30 days
      filtered = filtered.filter((h) => new Date(h.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    return filtered as PendingHack[];
  }, [filter, hacks, userId]);

  const setClaimMode = (mode: boolean) => {
    _setClaimMode(mode);
    if (!mode) {
      setSelectedHacks([]);
    }
  };

  const onClaimSelected = async () => {
    try {
      setLoading(true);
      await assignHacksToAdminForReview({ slugs: selectedHacks.map((h) => h.slug) });
      setLastClaimedCount(selectedHacks.length);
      setSelectedHacks([]);
      setError(null);
      setClaimMode(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onHackSelected = (hack: PendingHack) => {
    setSelectedHacks(selectedHacks.includes(hack) ? selectedHacks.filter((h) => h.slug !== hack.slug) : [...selectedHacks, hack]);
  };

  if (hacks.length === 0 || (filteredHacks.length === 0 && filter !== "assigned_to_me")) {
    return (
      <PendingHacksContainer
        totalCount={hacks.length}
        filteredCount={0}
        selectedCount={0}
        lastClaimedCount={lastClaimedCount}
        loading={loading}
        error={error}
        filter={filter}
        setFilter={setFilter}
        claimMode={claimMode}
        setClaimMode={setClaimMode}
        onClaimSelected={onClaimSelected}
      >
        <div className="flex items-center justify-center text-text-2 my-4">
          No pending hacks to review! 🎉
        </div>
      </PendingHacksContainer>
    )
  }

  if (filteredHacks.length === 0 && filter === "assigned_to_me") {
    return (
      <PendingHacksContainer
        totalCount={hacks.length}
        filteredCount={0}
        selectedCount={0}
        lastClaimedCount={lastClaimedCount}
        loading={loading}
        error={error}
        filter={filter}
        setFilter={setFilter}
        claimMode={claimMode}
        setClaimMode={setClaimMode}
        onClaimSelected={onClaimSelected}
      >
        <div className="flex items-center justify-center text-text-2 m-4">
          None of the currently {hacks.length} pending hacks have been claimed by you for review.
        </div>
      </PendingHacksContainer>
    )
  }

  return (
    <PendingHacksContainer
      totalCount={hacks.length}
      filteredCount={filteredHacks.length}
      selectedCount={selectedHacks.length}
      lastClaimedCount={lastClaimedCount}
      loading={loading}
      error={error}
      filter={filter}
      setFilter={setFilter}
      claimMode={claimMode}
      setClaimMode={setClaimMode}
      onClaimSelected={onClaimSelected}
    >
      {/* Header row (desktop only) */}
      <div className="hidden lg:grid grid-cols-12 bg-warn-soft px-4 py-2 text-xs text-warn">
        <div className="col-span-4">Title</div>
        <div className="col-span-4">Creator</div>
        <div className="col-span-4">Created</div>
      </div>
      <div className="divide-y divide-amber-600/20">
        {filteredHacks.map((h) => {
          return (
            <PendingHackCard
              key={h.slug}
              hack={h}
              userId={userId}
              selectMode={claimMode}
              selected={selectedHacks.includes(h)}
              onSelect={onHackSelected}
            />
          );
        })}
        {filter === "recent" && filteredHacks.length < hacks.length && (
          <div className="flex items-center justify-center text-text-2 m-4">
            + {hacks.length - filteredHacks.length} older pending hacks
          </div>
        )}
      </div>
    </PendingHacksContainer>
  );
}

interface PendingHacksContainerProps {
  totalCount: number;
  filteredCount: number;
  selectedCount: number;
  lastClaimedCount: number;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  claimMode: boolean;
  setClaimMode: (claimMode: boolean) => void;
  onClaimSelected: () => void;
}

function PendingHacksContainer({
  totalCount,
  filteredCount,
  selectedCount,
  lastClaimedCount,
  loading,
  error,
  children,
  filter,
  setFilter,
  claimMode,
  setClaimMode,
  onClaimSelected,
}: PendingHacksContainerProps) {
  return (
    <div className="mt-12">
      <div className="mb-2 flex flex-col md:flex-row gap-4 md:gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Pending hacks</h2>
          <span className="inline-flex items-center rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-medium text-warn border border-warn/40">
            {filteredCount}
          </span>
        </div>
        {/* Filter dropdown */}
        {totalCount > 0 && !claimMode && (
          <div className="flex items-center gap-2 w-full md:ml-auto md:max-w-2xs">
            <button
              className="h-10 inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-text hover:bg-surface-2 hover:cursor-pointer"
              onClick={() => setClaimMode(!claimMode)}
            >
              <FaUserCheck className="h-4 w-4 text-text" />
              <span>Claim</span>
            </button>
            <select
              className="w-full h-10 rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-text"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
            >
              <option value="unassigned">Unassigned</option>
              <option value="assigned_to_me">Assigned to me</option>
              <option value="recent">Recent (last 30 days)</option>
              <option value="all">All</option>
            </select>
          </div>
        )}
        {totalCount > 0 && claimMode && (
          <div className="flex items-center gap-2 ml-auto md:max-w-2xs">
            <button
              disabled={loading || selectedCount === 0}
              className="min-w-max h-10 inline-flex items-center gap-1 rounded-control border border-ready/40 bg-ready-soft hover:bg-ready-soft hover:cursor-pointer px-3 py-2 text-sm text-text disabled:border-line/30 disabled:bg-surface-2/50 disabled:text-text-3 disabled:cursor-not-allowed"
              onClick={onClaimSelected}
            >
              <FaUserCheck className="h-4 w-4 text-text mr-1" />
              <span>Claim selected</span>
            </button>
            <button
              disabled={loading}
              className="h-10 inline-flex items-center gap-1 rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-text enabled:hover:bg-surface-2 dark:enabled:hover:bg-white/10 enabled:hover:cursor-pointer disabled:border-line/30 disabled:bg-surface-2/50 disabled:text-text-3 disabled:cursor-not-allowed"
              onClick={() => setClaimMode(false)}
            >
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
      <div className="mb-2 text-sm text-text-3">
        Use "Claim" to select hacks whose creator you have already reached out to for verification.
      </div>
      {error && (
        <div className="mb-2 rounded-control border border-error/40 bg-error-soft p-3 text-sm text-error">
          {error}
        </div>
      )}
      {lastClaimedCount > 0 && (
        <div className="mb-2 rounded-control border border-ready/40 bg-ready-soft p-3 text-sm text-ready">
          {lastClaimedCount} hacks claimed successfully!
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-warn/40 bg-warn-soft">
        {children}
      </div>
    </div>
  );
}

interface PendingHackCardProps {
  hack: PendingHack;
  userId: string;
  selectMode: boolean;
  selected: boolean;
  onSelect: (hack: PendingHack) => void;
}

function PendingHackCard({ hack, userId, selectMode, selected, onSelect }: PendingHackCardProps) {
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
    ? "bg-warn-soft dark:bg-warn-soft hover:bg-warn-soft dark:hover:bg-warn-soft"
    : "bg-warn-soft hover:bg-warn-soft";

  const content = <>
    {/* Desktop row */}
    <div className="hidden lg:grid grid-cols-12 items-center">
      <div className="col-span-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="truncate font-medium text-warn group-hover:underline">{hack.title}</div>
              {hasMissingPatch && (
                <div className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                  <FiAlertTriangle className="h-3 w-3 text-warn" />
                  <span>Missing Patch</span>
                </div>
              )}
            </div>
            <div className="mt-0.5 text-xs text-warn group-hover:underline">/{hack.slug}</div>
            {hack.assigned_admin && hack.assigned_admin === userId ? (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warn">
                <FaCircleCheck className="h-3 w-3 text-warn" />
                <span>Assigned to you</span>
              </div>
            ) : hack.assigned_admin_username && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-warn">
                <span>Assigned to <span className="font-bold">@{hack.assigned_admin_username}</span></span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-4 flex flex-col min-w-0">
        {hack.creator_full_name && <div className="text-xs text-warn">{hack.creator_full_name}</div>}
        <div className="text-warn">
          {creator}
          {hack.creator_verified && (
            <div className="group/verified relative inline-flex items-center group ml-1">
              <FaCircleCheck className="text-warn" size={12} />
              <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 group-hover/verified:block group-hover/verified:opacity-100">
                Creator is verified
              </div>
            </div>
          )}
        </div>
        {hack.creator_email && (
          <div className="text-xs text-warn truncate mt-0.5">{hack.creator_email}</div>
        )}
      </div>
      <div className="col-span-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="text-warn flex-1">{createdDate}</div>
          {selectMode && selected ? (
            <FaCircleCheck className="h-6 w-6 text-text-2 flex-shrink-0" />
          ) : selectMode ? (
            <FaRegCircle className="h-6 w-6 text-text-2 flex-shrink-0" />
          ) : (
            <FiExternalLink className="h-4 w-4 text-text-2 flex-shrink-0" />
          )}
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
              <div className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                <FiAlertTriangle className="h-3 w-3 text-warn" />
                <span>Missing Patch</span>
              </div>
            )}
          </div>
          <div className="mt-0.5 text-xs text-text-3 break-all">/{hack.slug}</div>
          <div className="flex flex-col gap-1 text-xs text-warn mt-2">
            {(hack.creator_full_name || hack.creator_email) && (
              <div className="text-warn break-all flex flex-wrap items-center gap-2">
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
          {hack.assigned_admin && hack.assigned_admin === userId ? (
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-warn">
              <FaCircleCheck className="h-3 w-3 text-warn" />
              <span>Assigned to you</span>
            </div>
          ) : hack.assigned_admin_username && (
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-warn">
              <span>Assigned to <span className="font-bold">@{hack.assigned_admin_username}</span></span>
            </div>
          )}
        </div>
        {selectMode && selected ? (
          <FaCircleCheck className="h-6 w-6 text-text-2 flex-shrink-0" />
        ) : selectMode ? (
          <FaRegCircle className="h-6 w-6 text-text-2 flex-shrink-0" />
        ) : (
          <FiExternalLink className="h-4 w-4 text-text-2 flex-shrink-0" />
        )}
      </div>
    </div>
  </>

  if (selectMode) {
    return (
      <div
        key={hack.slug}
        className={`group block px-4 py-3 text-sm ${bgClasses} transition-colors hover:cursor-pointer`}
        onClick={() => onSelect(hack)}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      key={hack.slug}
      href={`/hack/${hack.slug}`}
      target="_blank"
      className={`group block px-4 py-3 text-sm ${bgClasses} transition-colors`}
    >
      {content}
    </Link>
  );
}

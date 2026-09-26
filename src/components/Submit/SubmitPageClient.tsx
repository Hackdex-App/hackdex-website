"use client";

import React from "react";
import type { CatalogTagRow } from "@/types/catalogTag";
import HackForm from "@/components/Hack/HackForm";
import ArchiveModeSelector from "@/components/Submit/ArchiveModeSelector";
import EntryLayoutSelector, { type EntryLayout } from "@/components/Submit/EntryLayoutSelector";

export default function SubmitPageClient({
  canCreateArchive,
  dummy,
  catalogTags,
}: {
  canCreateArchive: boolean;
  dummy: boolean;
  catalogTags: CatalogTagRow[];
}) {
  const [showModeSelector, setShowModeSelector] = React.useState(canCreateArchive);
  const [showLayoutSelector, setShowLayoutSelector] = React.useState(!canCreateArchive);
  const [entryLayout, setEntryLayout] = React.useState<EntryLayout>("single");
  const [customCreator, setCustomCreator] = React.useState<string | undefined>(undefined);
  const [permissionFrom, setPermissionFrom] = React.useState<string | undefined>(undefined);
  const [isArchive, setIsArchive] = React.useState(false);

  if (showModeSelector) {
    return (
      <ArchiveModeSelector
        onSelect={(options) => {
          const archive = options?.isArchive ?? false;
          setCustomCreator(options?.customCreator);
          setPermissionFrom(options?.permissionFrom);
          setIsArchive(archive);
          setShowModeSelector(false);
          setShowLayoutSelector(!archive);
        }}
      />
    );
  }

  if (showLayoutSelector) {
    return (
      <EntryLayoutSelector
        onSelect={(layout) => {
          setEntryLayout(layout);
          setShowLayoutSelector(false);
        }}
        onBack={canCreateArchive ? () => {
          setShowLayoutSelector(false);
          setShowModeSelector(true);
        } : undefined}
      />
    );
  }

  return (
    <HackForm
      mode="create"
      dummy={dummy}
      isArchive={isArchive}
      permissionFrom={permissionFrom}
      customCreator={customCreator}
      multiSource={entryLayout === "multi"}
      catalogTags={catalogTags}
    />
  );
}

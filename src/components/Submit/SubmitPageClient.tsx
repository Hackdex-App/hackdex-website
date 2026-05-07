"use client";

import React from "react";
import type { CatalogTagRow } from "@/types/catalogTag";
import HackForm from "@/components/Hack/HackForm";
import ArchiveModeSelector from "@/components/Submit/ArchiveModeSelector";

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
  const [customCreator, setCustomCreator] = React.useState<string | undefined>(undefined);
  const [permissionFrom, setPermissionFrom] = React.useState<string | undefined>(undefined);
  const [isArchive, setIsArchive] = React.useState(false);

  if (showModeSelector) {
    return <ArchiveModeSelector
      onSelect={(options) => {
        setCustomCreator(options?.customCreator);
        setPermissionFrom(options?.permissionFrom);
        setIsArchive(options?.isArchive ?? false);
        setShowModeSelector(false);
      }}
    />;
  }

  return <HackForm
    mode="create"
    dummy={dummy}
    isArchive={isArchive}
    permissionFrom={permissionFrom}
    customCreator={customCreator}
    catalogTags={catalogTags}
  />;
}

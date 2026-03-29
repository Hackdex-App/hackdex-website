"use client";

import React from "react";
import type { CatalogTagRow } from "@/types/catalogTag";
import HackSubmitForm from "@/components/Hack/HackSubmitForm";
import HackEditForm from "@/components/Hack/HackEditForm";

type Mode = "create" | "edit";

interface HackFormCreateProps {
  mode: "create";
  dummy?: boolean;
  isArchive?: boolean;
  permissionFrom?: string;
  customCreator?: string;
  catalogTags: CatalogTagRow[];
}

interface HackFormEditProps {
  mode: "edit";
  slug: string;
  initial: React.ComponentProps<typeof HackEditForm>["initial"];
  catalogTags: CatalogTagRow[];
}

export type HackFormProps = HackFormCreateProps | HackFormEditProps;

export default function HackForm(props: HackFormProps) {
  if (props.mode === "create") {
    return <HackSubmitForm
      dummy={props.dummy}
      isArchive={props.isArchive}
      permissionFrom={props.permissionFrom}
      customCreator={props.customCreator}
      catalogTags={props.catalogTags}
    />;
  }
  return <HackEditForm slug={props.slug} initial={props.initial} catalogTags={props.catalogTags} />;
}



"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function MobileFooterSpacer() {
  const pathname = usePathname();
  const isHackPage = pathname?.startsWith("/hack/") || false;
  if (!isHackPage) return null;
  return (
    <div className="md:hidden h-[200px] pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />
  );
}



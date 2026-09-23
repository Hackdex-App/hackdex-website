"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      offset="72px"
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            "rounded-card border border-black/10 bg-white text-zinc-950 shadow-2xl shadow-black/15 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:shadow-black/30",
          icon: "text-zinc-950 dark:text-zinc-50",
          title: "text-sm font-medium text-zinc-950 dark:text-zinc-50",
          description: "text-sm text-zinc-600 dark:text-zinc-300",
          actionButton:
            "rounded-control bg-accent-deep px-3 py-1.5 text-sm font-medium text-white",
          cancelButton:
            "rounded-control border border-black/10 bg-surface-2 px-3 py-1.5 text-sm text-zinc-950 dark:border-white/15 dark:text-zinc-50",
        },
      }}
      style={
        {
          "--normal-bg": "var(--background)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.75rem",
        } as CSSProperties
      }
    />
  );
}

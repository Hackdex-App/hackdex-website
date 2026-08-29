"use client";

import { useEffect, useState } from "react";

export default function NoticeBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchNotice() {
      try {
        const response = await fetch("/api/notice", {
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const data: unknown = await response.json();
        if (
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          (typeof data.message === "string" || data.message === null)
        ) {
          setMessage(data.message);
        }
      } catch {
        // Fail silently if the notice endpoint is unavailable.
      }
    }

    void fetchNotice();

    return () => controller.abort();
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="w-full border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-100">
      <div className="mx-auto flex max-w-screen-2xl items-center px-6 py-2 text-sm">
        <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-amber-50 dark:bg-amber-400 dark:text-amber-950">
          !
        </span>
        <p className="line-clamp-3">
          {message}
        </p>
      </div>
    </div>
  );
}



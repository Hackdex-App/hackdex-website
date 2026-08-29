import { get } from "@vercel/edge-config";
import { unstable_cache } from "next/cache";

const NOTICE_KEY = process.env.NEXT_PUBLIC_NOTICE_KEY ?? "global_notice_message";

const getNoticeMessage = unstable_cache(
  async () => {
    try {
      const value = await get<string | null>(NOTICE_KEY);
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    } catch {
      // Fail silently if Edge Config is unavailable or misconfigured
    }
    return null;
  },
  ["notice-banner", NOTICE_KEY],
  { revalidate: 60, tags: ["notice-banner"] },
);

export default async function NoticeBanner() {
  const message = await getNoticeMessage();

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



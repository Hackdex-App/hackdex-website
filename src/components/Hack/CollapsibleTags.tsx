"use client";

import { buildDiscoverSearchParams, DISCOVER_DEFAULT_STATE } from "@/app/discover/search-params";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiChevronDown } from "react-icons/fi";

/**
 * Tags collapse to one row with the next row peeking under a fade, so the
 * reader sees there is more before opening it in place. No control when one row fits.
 */
export default function CollapsibleTags({ tags }: { tags: string[] }) {
  const ref = useRef<HTMLUListElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const row = el.firstElementChild?.clientHeight ?? 0;
      setOverflows(el.scrollHeight > row + 2);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags]);

  if (tags.length === 0) return null;
  const collapsed = overflows && !open;
  return (
    <div className="mt-3.5">
      <div
        className={collapsed ? "max-h-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_24px,transparent_40px)]" : ""}
      >
        <ul ref={ref} className="flex flex-wrap gap-1.5" aria-label="Tags">
          {tags.map((t) => (
            <li key={t}>
              <Link
                href={`/discover?${buildDiscoverSearchParams({ ...DISCOVER_DEFAULT_STATE, tags: [t] }).toString()}`}
                aria-label={`View hacks tagged ${t}`}
                className="inline-block rounded-full bg-surface-2 px-2.5 py-1 text-[13px] leading-tight text-text-2 transition-colors hover:bg-line hover:text-text"
              >
                {t}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {overflows && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-[13px] text-text-2 transition-colors hover:text-text">
          {open ? "Show less" : "Show more"} <FiChevronDown className={`h-4 w-4 transition-transform duration-[160ms] ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

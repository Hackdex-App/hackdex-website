"use client";

import { buildDiscoverSearchParams, DISCOVER_DEFAULT_STATE } from "@/app/discover/search-params";
import Link from "next/link";
import { useState, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import { FaChevronDown } from "react-icons/fa6";

interface CollapsibleTagsProps {
  tags: string[];
}

// Tag height: ~28px (px-2.5 py-1 text-xs), gap: 8px
// Max height: 2.5 × 28px + 2 × 8px = 86px (rounded to 88px for safety)
const MAX_HEIGHT = 72;

export default function CollapsibleTags({ tags }: CollapsibleTagsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const checkIfExpansionNeeded = useCallback(() => {
    if (!contentRef.current) return;
    const height = contentRef.current.scrollHeight;
    setNaturalHeight(height);
    setNeedsExpansion(height > MAX_HEIGHT);
  }, []);

  // Use useLayoutEffect to check synchronously before paint
  useLayoutEffect(() => {
    checkIfExpansionNeeded();
  }, [tags, checkIfExpansionNeeded]);

  // Also check on window resize
  useEffect(() => {
    window.addEventListener("resize", checkIfExpansionNeeded);
    return () => {
      window.removeEventListener("resize", checkIfExpansionNeeded);
    };
  }, [checkIfExpansionNeeded]);

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={
          !isExpanded
            ? {
                gridTemplateRows: `${MAX_HEIGHT}px`,
                borderBottom: "2px solid var(--border)",
              }
            : naturalHeight
            ? {
                gridTemplateRows: `${naturalHeight}px`,
                borderBottom: "0px solid transparent",
              }
            : {
                gridTemplateRows: "1fr",
                borderBottom: "0px solid transparent",
              }
        }
      >
        <div className="overflow-hidden">
          <div
            ref={contentRef}
            className="flex flex-wrap gap-2"
          >
            {tags.map((t) => (
              <Link
                key={t}
                href={`/discover?${buildDiscoverSearchParams({
                  ...DISCOVER_DEFAULT_STATE,
                  tags: [t],
                }).toString()}`}
                aria-label={`View hacks tagged ${t}`}
                className="rounded-full bg-(--surface-2) px-2.5 py-1 text-xs ring-1 ring-(--border) transition-colors md:cursor-pointer md:hover:bg-(--surface-3)"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 w-full md:w-auto md:justify-start md:mt-2 px-4 md:px-0 pt-2 pb-4 md:py-0 text-sm md:text-xs font-medium text-foreground/70 hover:text-foreground transition-colors active:opacity-70 md:active:opacity-100"
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? "Show less" : "Show more"}</span>
          <span
            className={`text-foreground/60 shrink-0 transition-transform duration-300 ease-in-out ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            <FaChevronDown className="w-3.5 h-3.5 md:w-3 md:h-3" />
          </span>
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";

interface CollapsibleCardProps {
  title: string;
  /** Icon or badge shown before the title (e.g. to signal editable settings) */
  leading?: ReactNode;
  /** Always visible under the title (e.g. current summary when collapsed) */
  summary?: ReactNode;
  titleId?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export default function CollapsibleCard({
  title,
  leading,
  summary,
  titleId,
  children,
  defaultExpanded = false,
  className,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`px-4 sm:px-5 ${className}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="py-4 sm:py-5 hover:cursor-pointer w-full flex items-start justify-between gap-3 text-left group-hover:opacity-80 transition-opacity"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0 flex gap-2.5 sm:gap-3 items-start">
          {leading != null && (
            <span className="shrink-0 mt-0.5 text-[var(--accent)] opacity-90" aria-hidden>
              {leading}
            </span>
          )}
          <div className="min-w-0 flex flex-col gap-0.5 flex-1">
            <h2 id={titleId} className="text-sm font-semibold text-foreground/90">
              {title}
            </h2>
            {summary != null && <div className="text-xs text-foreground/55 font-normal">{summary}</div>}
          </div>
        </div>
        <span
          className={`text-foreground/60 shrink-0 mt-0.5 transition-transform duration-300 ease-in-out ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <FaChevronDown size={14} />
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? "grid-rows-[1fr] pb-4 sm:pb-5" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className={`mt-3 transition-opacity duration-300 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export default function CollapsibleCard({ title, children, defaultExpanded = false, className }: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`px-4 sm:px-5 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="py-4 sm:py-5 hover:cursor-pointer w-full flex items-center justify-between gap-2 text-left group-hover:opacity-80 transition-opacity"
        aria-expanded={isExpanded}
      >
        <h2 className="text-sm font-semibold text-foreground/90">{title}</h2>
        <span
          className={`text-foreground/60 shrink-0 transition-transform duration-300 ease-in-out ${
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


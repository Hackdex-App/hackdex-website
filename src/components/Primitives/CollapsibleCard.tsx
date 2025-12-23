"use client";

import { useState, ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";

interface CollapsibleCardProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

export default function CollapsibleCard({ title, children, defaultExpanded = false }: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="card-simple p-4 sm:p-5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity"
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
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
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


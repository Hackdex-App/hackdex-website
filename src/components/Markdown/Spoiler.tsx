"use client";

import { useState } from "react";

interface SpoilerProps {
  children: React.ReactNode;
}

export default function Spoiler({ children }: SpoilerProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      onClick={() => setRevealed(true)}
      className={`inline rounded px-1 transition-colors duration-150 ${
        revealed
          ? "bg-foreground/20 text-foreground cursor-text"
          : "bg-foreground/50 text-transparent cursor-pointer hover:bg-foreground/60"
      }`}
    >
      {children}
    </span>
  );
}


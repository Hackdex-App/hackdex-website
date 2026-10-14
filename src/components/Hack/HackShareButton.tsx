"use client";

import React, { useState } from "react";
import { FiShare2 } from "react-icons/fi";
import ShareModal from "@/components/Hack/ShareModal";

interface HackShareButtonProps {
  title: string;
  url: string;
  author: string | null;
}

export default function HackShareButton({ title, url, author }: HackShareButtonProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowShareModal(true)}
        aria-label="Share hack"
        title="Share"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface text-sm font-medium text-text-2 transition-colors hover:border-text-3 hover:text-text px-3"
      >
        <FiShare2 size={18} />
        <span>Share</span>
      </button>
      {showShareModal && (
        <ShareModal title={title} url={url} author={author} onClose={() => setShowShareModal(false)} />
      )}
    </>
  );
}

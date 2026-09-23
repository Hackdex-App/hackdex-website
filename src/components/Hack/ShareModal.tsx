"use client";

import React, { useState } from "react";
import { FiCheck, FiCopy, FiMail, FiShare2, FiArrowLeft } from "react-icons/fi";
import { FaXTwitter, FaReddit, FaFacebook } from "react-icons/fa6";
import { PiBracketsSquareBold, PiBracketsAngleBold } from "react-icons/pi";
import Modal from "@/components/Primitives/Modal";

const BANNER_IMAGE_URL = "/img/badge-dark.png";
const BANNER_IMAGE_WIDTH = 190;
const BANNER_IMAGE_HEIGHT = 60;
const BANNER_IMAGE_FULL_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/img/badge-dark.png`;

interface ShareModalProps {
  title: string;
  url: string;
  author: string | null;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ title, url, author, onClose }) => {
  const [urlCopied, setUrlCopied] = useState(false);
  const [codePreview, setCodePreview] = useState<{ type: string; code: string; label: string } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const hasNavigatorShare = typeof navigator !== "undefined" && navigator.share;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy URL:", e);
    }
  };

  const copyCode = async () => {
    if (!codePreview) return;
    try {
      await navigator.clipboard.writeText(codePreview.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy code:", e);
    }
  };

  const getCodePreview = (type: string): { code: string; label: string } | null => {
    switch (type) {
      case "bbcode":
        return { code: `[url=${url}][img width=${BANNER_IMAGE_WIDTH} height=${BANNER_IMAGE_HEIGHT}]${BANNER_IMAGE_FULL_URL}[/img][/url]`, label: "BBCode" };
      case "html":
        return { code: `<a href="${url}"><img width="${BANNER_IMAGE_WIDTH}" height="${BANNER_IMAGE_HEIGHT}" src="${BANNER_IMAGE_FULL_URL}" alt="Download now at hackdex.app" /></a>`, label: "HTML" };
      default:
        return null;
    }
  };

  const handleShare = async (type: string) => {
    // Show preview for code formats
    if (type === "bbcode" || type === "html") {
      const preview = getCodePreview(type);
      if (preview) {
        setCodePreview({ type, ...preview });
        return;
      }
    }

    const socialTitle = author ? `Romhack: ${title} by ${author}` : `Romhack: ${title}`;

    switch (type) {
      case "other": {
        try {
          await navigator.share({
            title: socialTitle,
            url,
          });
        } catch (e) {
          // Ignore if user cancels share
          if (!(e instanceof Error) || e.name !== "AbortError") {
            console.error(e);
          }
        }
        break;
      }
      case "reddit": {
        const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(socialTitle)}`;
        window.open(redditUrl, "_blank", "width=1024,height=768");
        break;
      }
      case "twitter": {
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(socialTitle)}`;
        window.open(twitterUrl, "_blank", "width=1024,height=768");
        break;
      }
      case "email": {
        const subject = encodeURIComponent(`Check out ${title}`);
        const body = encodeURIComponent(`I found this ROM hack that you might like: ${url}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        break;
      }
      case "facebook": {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, "_blank", "width=1024,height=768");
        break;
      }
    }
  };

  const SocialIconButton = ({
    type,
    icon: Icon,
    label,
  }: {
    type: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => handleShare(type)}
      className="group flex min-w-[72px] flex-col items-center gap-1.5 rounded-card p-2 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 transition-colors group-hover:border-line-strong">
        <Icon size={22} />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  const badgePreview = (
    <div className="flex justify-center rounded-card bg-well p-3">
      <img src={BANNER_IMAGE_URL} width={BANNER_IMAGE_WIDTH} height={BANNER_IMAGE_HEIGHT} alt="Download now at hackdex.app" className="h-auto max-w-full rounded" />
    </div>
  );

  const copied = (
    <>
      <FiCheck size={16} className="text-ready" />
      <span className="text-ready">Copied</span>
    </>
  );

  if (codePreview) {
    return (
      <Modal visible title={`${codePreview.label} code`} onClose={onClose} className="max-w-lg">
        <div className="flex flex-col gap-5">
          <button type="button" onClick={() => setCodePreview(null)} className="-mt-2 inline-flex items-center gap-1.5 self-start text-sm font-medium text-link hover:underline hover:underline-offset-[3px]">
            <FiArrowLeft size={15} /> Back
          </button>
          <p className="text-sm text-text-2">Paste this where you post about the hack to show the badge.</p>
          {badgePreview}
          <div className="flex flex-col gap-2">
            <textarea
              readOnly
              value={codePreview.code}
              rows={3}
              className="w-full resize-none rounded-control border border-line bg-surface-2 px-3 py-2.5 font-mono text-[13px] text-text-2 outline-none focus:border-line-strong focus:ring-2 focus:ring-accent/40"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <button type="button" onClick={copyCode} className="inline-flex h-9 items-center gap-1.5 self-end rounded-control px-2.5 text-sm font-medium text-text-2 hover:bg-surface-2 hover:text-text" aria-label="Copy code to clipboard">
              {codeCopied ? copied : <><FiCopy size={16} /> Copy</>}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal visible title="Share this hack" onClose={onClose} className="max-w-lg">
      <div className="flex flex-col gap-5">
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={url}
            aria-label="Link to this hack"
            className="h-10 min-w-0 flex-1 rounded-control border border-line bg-surface-2 px-3 text-sm text-text-2 outline-none focus:border-line-strong focus:ring-2 focus:ring-accent/40"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={copyUrl}
            className="inline-flex h-10 flex-none items-center gap-1.5 rounded-control bg-accent-deep px-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {urlCopied ? <><FiCheck size={16} /> Copied</> : <><FiCopy size={16} /> Copy link</>}
          </button>
        </div>

        <div className="-mx-2 flex gap-1 overflow-x-auto [scrollbar-width:none]">
          <SocialIconButton type="facebook" icon={FaFacebook} label="Facebook" />
          <SocialIconButton type="reddit" icon={FaReddit} label="Reddit" />
          <SocialIconButton type="twitter" icon={FaXTwitter} label="Twitter/X" />
          <SocialIconButton type="email" icon={FiMail} label="Email" />
          {hasNavigatorShare && <SocialIconButton type="other" icon={FiShare2} label="More" />}
        </div>

        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">Share as a badge</h3>
          {badgePreview}
          <p className="text-xs text-text-3">
            <span className="font-semibold text-text-2">Creator tip:</span> Linking to your hack from other sites helps this page outrank unauthorized mirrors in search.
          </p>
          <div className="-mx-2 flex gap-1">
            <SocialIconButton type="bbcode" icon={PiBracketsSquareBold} label="BBCode" />
            <SocialIconButton type="html" icon={PiBracketsAngleBold} label="HTML" />
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default ShareModal;

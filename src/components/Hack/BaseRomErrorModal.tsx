"use client";

import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";

export type BaseRomErrorModalState =
  | { kind: "archive"; fileName: string; requiredExtensionPhrase: string; requiredRomName: string }
  | { kind: "unrecognized"; fileName: string; requiredExtensionPhrase: string; requiredRomName: string }
  | {
      kind: "hash_mismatch";
      fileName: string;
      selectedHash: string;
      requiredHash: string;
      requiredRomName: string;
      matchedRomName?: string;
    };

interface BaseRomErrorModalProps {
  state: BaseRomErrorModalState;
  onClose: () => void;
}

function getTitle(state: BaseRomErrorModalState): string {
  switch (state.kind) {
    case "archive":
      return "Extract your ROM first";
    case "unrecognized":
      return "Unrecognized file type";
    case "hash_mismatch":
      return "This isn't the correct base ROM";
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-3">
      {children}
    </h3>
  );
}

function HashBlock({
  label,
  hash,
  variant,
}: {
  label: string;
  hash: string;
  variant: "wrong" | "correct";
}) {
  const isWrong = variant === "wrong";
  const Icon = isWrong ? FaCircleXmark : FaCircleCheck;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-2">{label}</span>
      <div
        className={`flex items-center gap-2.5 rounded-control bg-surface px-3 py-2 ring-1 ring-inset ${
          isWrong ? "ring-error/40" : "ring-ready/40"
        }`}
      >
        <Icon
          className={`shrink-0 ${isWrong ? "text-error" : "text-ready"}`}
          size={14}
          aria-hidden
        />
        <div className="min-w-0 flex-1 overflow-x-auto">
          <code className="whitespace-nowrap text-xs">{hash}</code>
        </div>
      </div>
    </div>
  );
}

function ModalBody({ state }: { state: BaseRomErrorModalState }) {
  switch (state.kind) {
    case "archive":
      return (
        <p className="text-sm leading-relaxed text-text-2">
          Archive files like <code>.zip</code> need to be extracted first. After extracting, upload{" "}
          <strong>{state.requiredExtensionPhrase}</strong> for <strong>{state.requiredRomName}</strong>.
        </p>
      );
    case "unrecognized":
      return (
        <p className="text-sm leading-relaxed text-text-2">
          <code>{state.fileName}</code> isn&apos;t a ROM file. This hack requires{" "}
          <strong>{state.requiredRomName}</strong> — please select{" "}
          <strong>{state.requiredExtensionPhrase}</strong>.
        </p>
      );
    case "hash_mismatch":
      return (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <SectionLabel>What happened</SectionLabel>
            <p className="text-base leading-relaxed text-text">
              {state.matchedRomName ? (
                <>
                  This file looks like <strong>{state.matchedRomName}</strong>, but this hack needs{" "}
                  <strong>{state.requiredRomName}</strong>.
                </>
              ) : (
                <>
                  This file doesn&apos;t match a known clean copy of <strong>{state.requiredRomName}</strong>.
                </>
              )}
            </p>
          </section>

          <div className="rounded-control border border-warn/40 bg-warn-soft p-3 text-sm leading-relaxed text-warn">
            Patching against a non-matching ROM (even if that ROM is fully playable) can cause crashes, glitches, or broken saves.
          </div>

          <section className="flex flex-col gap-2">
            <SectionLabel>Compare checksums</SectionLabel>
            <div className="flex flex-col gap-3">
              <HashBlock label="Your file" hash={state.selectedHash} variant="wrong" />
              <HashBlock label={`Required — ${state.requiredRomName}`} hash={state.requiredHash} variant="correct" />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <SectionLabel>Common reasons</SectionLabel>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-2">
              <li>Wrong revision or region</li>
              <li>The ROM was modified or trimmed</li>
              <li>The file is corrupted or incomplete</li>
            </ul>
          </section>

          <div className="rounded-control border border-line bg-surface-2 p-3 text-xs leading-relaxed text-text-3">
            Hackdex cannot advise on where to find ROMs. The only legal source is ripping from your own cartridge.
          </div>
        </div>
      );
  }
}

const BaseRomErrorModal: React.FC<BaseRomErrorModalProps> = ({ state, onClose }) => {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, []);

  const title = getTitle(state);

  return (
    <div className="fixed inset-0 z-[100] flex md:items-center md:justify-center md:p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 md:backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="base-rom-error-title"
        className="relative z-[101] flex h-full w-full flex-col card backdrop-blur-lg dark:!bg-black/70 rounded-none md:h-auto md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-card"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-control text-text-3 hover:text-text hover:bg-surface-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <FiX size={20} />
        </button>

        <div className="flex-1 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <h2 id="base-rom-error-title" className="text-xl font-semibold pr-8">
            {title}
          </h2>
          {state.kind !== "unrecognized" && (
            <p className="mt-2 text-sm text-text-2">
              Selected file: <code>{state.fileName}</code>
            </p>
          )}
          <div className="mt-6">
            <ModalBody state={state} />
          </div>
        </div>

        <div className="border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:border-0 md:p-6 md:pt-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-14 md:h-11 w-full items-center justify-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Choose a different file
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseRomErrorModal;

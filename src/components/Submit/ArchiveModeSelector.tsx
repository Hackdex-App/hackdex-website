"use client";

import React, { useEffect, useState } from "react";

type ArchiveModeSelectorProps = {
  onSelect: (options?: {
    customCreator?: string,
    permissionFrom?: string,
    isArchive?: boolean,
  }) => void;
};

const ArchiveModeSelector: React.FC<ArchiveModeSelectorProps> = ({ onSelect }) => {
  const [currentPage, setCurrentPage] = useState<"first" | "second">("first");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionFrom, setPermissionFrom] = useState<string | null>(null);
  const [isSamePerson, setIsSamePerson] = useState<boolean | null>(null);
  const [customCreator, setCustomCreator] = useState<string | null>(null);

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

  const canProceed = () => {
    if (hasPermission === false) return false;
    if (hasPermission === true) {
      if (!permissionFrom?.trim()) return false;
      if (isSamePerson === true) return true;
      if (isSamePerson === false && customCreator) {
        return customCreator.trim().length > 0;
      }
      return false;
    }
    return false;
  };

  const handleGetStarted = () => {
    if (!canProceed()) return;

    if (isSamePerson === true) {
      onSelect({
        permissionFrom: permissionFrom?.trim(),
        customCreator: permissionFrom?.trim(),
      });
    } else {
      onSelect({
        permissionFrom: permissionFrom?.trim(),
        customCreator: customCreator?.trim(),
      });
    }
  };

  const renderFirstPage = () => (
    <div className="flex flex-col gap-8 sm:gap-4">
      <div>
        <div className="text-xl font-semibold">What would you like to create?</div>
        <p className="mt-1 text-sm text-text-2">
          Choose whether you&apos;re creating a new hack for yourself or uploading on behalf of another creator without an account.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSelect()}
          className="inline-flex items-center justify-center rounded-control bg-accent-deep px-5 text-white transition-colors hover:enabled:bg-accent-hover disabled:opacity-60 h-14 sm:h-11 w-full text-sm font-semibold"
        >
          <span>Create my own hack</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage("second")}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-control px-4 text-sm font-semibold ring-1 ring-line hover:bg-surface-2"
        >
          Submit someone else&apos;s hack
        </button>
      </div>
    </div>
  );

  const renderSecondPage = () => (
    <div className="flex flex-col gap-6 sm:gap-4">
      <div>
        <div className="text-xl font-semibold">Permission Confirmation</div>
        <p className="mt-1 text-sm text-text-2">
          We need to confirm that you have permission to upload this romhack on behalf of the original creator.
        </p>
      </div>

      <div className="flex flex-col gap-8 my-4">
        <div>
          <label className="text-sm font-semibold mb-2 block">
            Did you receive explicit permission to upload this hack to HackDex?
          </label>
          <p className="text-sm text-text-2">
            You should be able to provide evidence of this permission if asked.
          </p>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasPermission"
                checked={hasPermission === true}
                onChange={() => setHasPermission(true)}
                className="w-4 h-4"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="hasPermission"
                checked={hasPermission === false}
                onChange={() => setHasPermission(false)}
                className="w-4 h-4"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>

        {hasPermission === true && (
          <>
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Who gave you this permission?
              </label>
              <input
                type="text"
                value={permissionFrom ?? ""}
                onChange={(e) => setPermissionFrom(e.target.value)}
                placeholder="Enter name"
                className="w-full px-3 py-2 rounded-control border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>

            {permissionFrom && permissionFrom.trim() && (
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  Does the person who gave permission have the same name as the original creator or team who made this hack?
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isSamePerson"
                      checked={isSamePerson === true}
                      onChange={() => setIsSamePerson(true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isSamePerson"
                      checked={isSamePerson === false}
                      onChange={() => setIsSamePerson(false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            )}

            {isSamePerson === false ? (
              <div>
                <label className="text-sm font-semibold mb-2 block">
                  What is the original creator&apos;s or team&apos;s name?
                </label>
                <p className="text-sm text-text-2 mb-2">
                  This will appear on the hack&apos;s page as <span className="font-semibold">by {customCreator || "username"}</span>.
                </p>
                <input
                  type="text"
                  value={customCreator ?? ""}
                  onChange={(e) => setCustomCreator(e.target.value)}
                  placeholder="Enter creator or team name"
                  className="w-full px-3 py-2 rounded-control border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            ) : isSamePerson === true && permissionFrom && permissionFrom.trim() && (
              <div>
                <p className="text-sm text-text-2">
                  This will appear on the hack&apos;s page as <span className="font-semibold">by {permissionFrom}</span>.
                </p>
              </div>
            )}
          </>
        )}

        {hasPermission === false && (
          <div className="p-4 rounded-control bg-surface-2 border border-line">
            <p className="text-sm text-text">
              You need explicit permission from the original creator in order to upload on their behalf.
              Alternatively, you could ask if they are interested in creating a Hackdex account to submit their own hack.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={!canProceed()}
          className="inline-flex items-center justify-center rounded-control bg-accent-deep px-5 text-white transition-colors hover:enabled:bg-accent-hover disabled:opacity-60 h-14 sm:h-11 w-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Get Started</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCurrentPage("first");
            setHasPermission(null);
            setPermissionFrom(null);
            setIsSamePerson(null);
            setCustomCreator(null);
          }}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-control px-4 text-sm font-semibold ring-1 ring-line hover:bg-surface-2"
        >
          Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed left-0 right-0 top-16 bottom-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={currentPage === "first" ? "Select hack type" : "Permission confirmation"}
        className="relative z-[101] mb-16 card backdrop-blur-lg dark:!bg-white/6 p-6 max-w-md max-h-[85vh] overflow-y-auto w-full rounded-card"
      >
        {currentPage === "first" ? renderFirstPage() : renderSecondPage()}
      </div>
    </div>
  );
};

export default ArchiveModeSelector;

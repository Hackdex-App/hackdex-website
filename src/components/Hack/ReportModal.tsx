"use client";

import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { FaCircleCheck } from "react-icons/fa6";
import { submitHackReport } from "@/app/hack/[slug]/actions";

type ReportType = "hateful" | "harassment" | "misleading" | "stolen";

interface ReportModalProps {
  slug: string;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ slug, onClose }) => {
  const [currentPage, setCurrentPage] = useState<"select" | "details" | "success">("select");
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [details, setDetails] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  const canSubmit = () => {
    if (!reportType) return false;

    if (!details.trim()) return false;

    if (email.trim()) {
      // Basic email validation (matches server-side validation pattern)
      const emailRegex = /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_'+\-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/;
      if (!emailRegex.test(email.trim().toLowerCase())) return false;
    }

    return reportType !== "stolen" || !!email.trim();
  };

  const handleSubmit = async () => {
    if (!canSubmit() || !reportType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitHackReport({
        slug,
        reportType,
        details: details.trim() || null,
        email: email.trim() || null,
        isImpersonating: reportType === "stolen" ? isImpersonating : null,
      });

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        setCurrentPage("success");
        setIsSubmitting(false);
      }
    } catch (e) {
      setError("Failed to submit report. Please try again.");
      setIsSubmitting(false);
    }
  };

  const renderSelectPage = () => (
    <div className="flex flex-col gap-8 sm:gap-4">
      <div className="mb-2">
        <div className="text-xl font-semibold">Report Hack</div>
        <p className="mt-1 text-sm text-foreground/80">
          Please select the reason for reporting this hack.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setReportType("hateful");
            setCurrentPage("details");
          }}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          Hateful content
        </button>
        <button
          type="button"
          onClick={() => {
            setReportType("harassment");
            setCurrentPage("details");
          }}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          Harassment
        </button>
        <button
          type="button"
          onClick={() => {
            setReportType("misleading");
            setCurrentPage("details");
          }}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          Misleading
        </button>
        <button
          type="button"
          onClick={() => {
            setReportType("stolen");
            setCurrentPage("details");
          }}
          className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)]"
        >
          My hack was stolen
        </button>
      </div>
    </div>
  );

  const renderSuccessPage = () => (
    <div className="flex flex-col gap-6 sm:gap-4">
      <div className="mb-2">
        <div className="text-xl font-semibold">Report Submitted</div>
        <p className="mt-1 text-sm text-foreground/80">
          Thank you for your report. We will review it and take appropriate action.
        </p>
      </div>

      <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20">
        <p className="text-green-500 font-semibold flex items-center justify-center gap-2">
          <FaCircleCheck size={18} />
          Report successfully sent!
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-14 sm:h-11 w-full text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] enabled:hover:bg-[var(--accent-700)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Done
        </button>
      </div>
    </div>
  );

  const renderDetailsPage = () => {
    const isStolen = reportType === "stolen";

    return (
      <div className="flex flex-col gap-6 sm:gap-4">
        <div className="mb-2">
          <div className="text-xl font-semibold">
            {reportType === "hateful" && "Hateful Content"}
            {reportType === "harassment" && "Harassment"}
            {reportType === "misleading" && "Misleading"}
            {reportType === "stolen" && "My Hack Was Stolen"}
          </div>
          <p className="mt-1 text-sm text-foreground/80">
            {isStolen
              ? "Please provide your contact information and details about the stolen hack."
              : "Please provide additional details."}
          </p>
        </div>

        {isStolen && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImpersonating}
                onChange={(e) => setIsImpersonating(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold">Is the uploader impersonating you?</span>
            </label>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold mb-2 block">
            Contact Email
            {isStolen ? (
              <span className="text-red-500"> *</span>
            ) : (
              <span className="text-foreground/60 text-xs ml-1">(optional)</span>
            )}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required={isStolen}
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="text-sm font-semibold mb-2 block">
            Additional Details <span className="text-red-500">*</span>
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              isStolen
                ? "Please provide important context, proof of ownership, and any other relevant information..."
                : "Please provide additional context..."
            }
            rows={6}
            required
            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>

        {isStolen && (
          <div className="p-4 rounded-md bg-[var(--surface-2)] border border-[var(--border)]">
            <p className="text-sm text-foreground/90">
              <strong>Note:</strong> We will reach out to you via email. Please ensure you have sufficient proof that you are the original creator of this hack.
            </p>
          </div>
        )}

        {!isStolen && (
          <div className="p-4 rounded-md bg-[var(--surface-2)] border border-[var(--border)]">
            <p className="text-sm text-foreground/90">
              <strong>Note:</strong> If we have questions, we will reach out via email for clarification.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className="inline-flex items-center justify-center h-14 sm:h-11 w-full text-sm font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-foreground)] enabled:hover:bg-[var(--accent-700)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentPage("select");
              setReportType(null);
              setDetails("");
              setEmail("");
              setIsImpersonating(false);
              setError(null);
            }}
            disabled={isSubmitting}
            className="inline-flex h-14 sm:h-11 w-full items-center justify-center rounded-md px-4 text-sm font-semibold ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed left-0 right-0 top-0 bottom-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          currentPage === "select"
            ? "Select report type"
            : currentPage === "success"
            ? "Report submitted"
            : "Report details"
        }
        className="relative z-[101] mb-16 card backdrop-blur-lg dark:!bg-black/70 p-6 max-w-md max-h-[85vh] overflow-y-auto w-full rounded-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <FiX size={20} />
        </button>
        {currentPage === "select"
          ? renderSelectPage()
          : currentPage === "success"
          ? renderSuccessPage()
          : renderDetailsPage()}
      </div>
    </div>
  );
};

export default ReportModal;

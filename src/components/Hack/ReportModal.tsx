"use client";

import React, { useState } from "react";
import { FaCircleCheck } from "react-icons/fa6";
import Modal from "@/components/Primitives/Modal";
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

  const reset = () => {
    setCurrentPage("select");
    setReportType(null);
    setDetails("");
    setEmail("");
    setIsImpersonating(false);
    setError(null);
  };

  const field = "w-full rounded-control border border-line bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40";
  const primary = "inline-flex h-11 w-full items-center justify-center rounded-control bg-accent-deep px-4 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";
  const secondary = "inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong px-4 text-sm font-medium text-text-2 transition-colors hover:enabled:border-text-3 hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-50";

  const renderSelectPage = () => (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-2">What is wrong with this hack?</p>
      <div className="flex flex-col gap-2">
        {REASONS.map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setReportType(type);
              setCurrentPage("details");
            }}
            className="flex h-12 w-full items-center rounded-control border border-line px-4 text-left text-sm font-medium transition-colors hover:border-line-strong hover:bg-surface-2"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderSuccessPage = () => (
    <div className="flex flex-col gap-5">
      <p className="flex items-center gap-2 rounded-control bg-ready-soft px-3 py-2.5 text-sm font-medium text-ready">
        <FaCircleCheck size={16} /> Thanks. We will review your report.
      </p>
      <button type="button" onClick={onClose} className={primary}>
        Done
      </button>
    </div>
  );

  const renderDetailsPage = () => {
    const isStolen = reportType === "stolen";

    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-2">
          {isStolen ? "Tell us how to reach you and how we can confirm the hack is yours." : "Tell us what you found."}
        </p>

        {isStolen && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" checked={isImpersonating} onChange={(e) => setIsImpersonating(e.target.checked)} className="h-4 w-4 accent-[var(--rose-deep)]" />
            The uploader is pretending to be me
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Contact email {isStolen ? <span className="text-error">*</span> : <span className="text-xs font-normal text-text-3">(optional)</span>}
          </span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required={isStolen} className={`${field} h-10`} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Details <span className="text-error">*</span>
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={isStolen ? "Proof that you made it, links, anything that helps…" : "What did you see, and where?"}
            rows={5}
            required
            className={`${field} resize-none py-2`}
          />
        </label>

        <p className="text-xs text-text-3">
          {isStolen ? "We will email you. Have proof ready that you made this hack." : "If we have questions, we will email you."}
        </p>

        {error && <p className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">{error}</p>}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
          <button type="button" onClick={reset} disabled={isSubmitting} className={secondary}>
            Back
          </button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit() || isSubmitting} className={primary}>
            {isSubmitting ? "Sending…" : "Send report"}
          </button>
        </div>
      </div>
    );
  };

  const title = currentPage === "success" ? "Report sent" : currentPage === "details" ? REASONS.find(([t]) => t === reportType)?.[1] ?? "Report" : "Report this hack";

  return (
    <Modal visible title={title} onClose={onClose}>
      {currentPage === "select" ? renderSelectPage() : currentPage === "success" ? renderSuccessPage() : renderDetailsPage()}
    </Modal>
  );
};

const REASONS: [ReportType, string][] = [
  ["hateful", "Hateful content"],
  ["harassment", "Harassment"],
  ["misleading", "Misleading"],
  ["stolen", "My hack was stolen"],
];

export default ReportModal;

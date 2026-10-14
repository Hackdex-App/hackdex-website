"use client";

import React, { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { validateEmail } from "@/utils/auth";
import { sendContact, type ContactActionState } from "@/app/contact/actions";
import Select from "@/components/Primitives/Select";

type Topic =
  | "general"
  | "bug"
  | "account"
  | "creator"
  | "security"
  | "other";

const topicLabels: Record<Topic, string> = {
  general: "General question",
  bug: "Bug report",
  account: "Account issue",
  creator: "Creator support",
  security: "Security disclosure",
  other: "Other",
};

export default function ContactForm() {
  const searchParams = useSearchParams();

  const topicFromParams = (searchParams.get("topic") || "general").toLowerCase() as Topic;
  const [topic, setTopic] = React.useState<Topic>(
    (Object.keys(topicLabels) as Topic[]).includes(topicFromParams) ? topicFromParams : "general"
  );

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const [contextUrl, setContextUrl] = React.useState("");

  React.useEffect(() => {
    const { error } = validateEmail(email);
    setEmailError(error);
  }, [email]);

  const isValid = React.useMemo(() => {
    return !emailError && !!email && !!message;
  }, [emailError, email, message]);
  const [state, formAction, isPending] = useActionState<ContactActionState, FormData>(sendContact, { error: null, success: null });

  React.useEffect(() => {
    if (state.success) {
      // Reset form on success
      setName("");
      setEmail("");
      setMessage("");
      setContextUrl("");
    }
  }, [state.success]);

  return (
    <form className="grid gap-5 group">
      {(state.error && !isPending) && (
        <div className="rounded-control bg-error-soft ring-1 ring-error/40 px-3 py-2 text-sm text-error">
          {state.error}
        </div>
      )}
      {(state.success && !isPending) && (
        <div className="rounded-control bg-ready-soft ring-1 ring-ready/40 px-3 py-2 text-sm text-ready">
          {state.success}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="topic" className="text-sm text-text-2">Topic</label>
        <Select
          id="topic"
          name="topic"
          value={topic}
          onChange={(value) => setTopic(value as Topic)}
          options={(Object.keys(topicLabels) as Topic[]).map((key) => ({
            value: key,
            label: topicLabels[key],
          }))}
        />
        <span className="text-xs text-text-3">
          Choose the most relevant topic so we can help you better.
        </span>
      </div>

      {topic === "bug" && (
        <div className="p-4 rounded-control bg-surface-2 border border-line">
          <p className="text-sm text-text">
            <strong>Note:</strong> This form is meant only for bugs with the Hackdex website. For bugs found in a rom hack, please reach out to the original creator of that hack.
          </p>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm text-text-2">Name (optional)</label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-11 rounded-control bg-surface-2 px-3 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40"
            autoComplete="name"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm text-text-2">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`h-11 rounded-control bg-surface-2 px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              email && emailError ? "ring-error/40 bg-error-soft dark:ring-error/40 dark:bg-error-soft" : "ring-line"
            }`}
            required
            autoComplete="email"
          />
          {email && emailError && (
            <span className="text-xs text-error">{emailError}</span>
          )}
        </div>
      </div>

      {(topic === "bug" || topic === "creator" || topic === "account") && (
        <div className="grid gap-2">
          <label htmlFor="contextUrl" className="text-sm text-text-2">Related URL (optional)</label>
          <input
            id="contextUrl"
            name="contextUrl"
            type="url"
            value={contextUrl}
            onChange={(e) => setContextUrl(e.target.value)}
            placeholder="https://hackdex.app/..."
            className="h-11 rounded-control bg-surface-2 px-3 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40"
            inputMode="url"
          />
          <span className="text-xs text-text-3">Linking the exact page helps us investigate faster.</span>
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm text-text-2">Message</label>
        <textarea
          id="message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            topic === "bug"
              ? "What happened? What did you expect? Any steps to reproduce?"
              : topic === "security"
              ? "Please provide enough detail to help us triage. Avoid sharing sensitive data."
              : "How can we help?"
          }
          className="min-h-[8rem] rounded-control bg-surface-2 px-3 py-2 text-sm ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-accent/40"
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid || isPending}
          className="inline-flex items-center justify-center rounded-control bg-accent-deep px-5 text-white transition-colors hover:enabled:bg-accent-hover disabled:opacity-60 h-11 min-w-[7.5rem] text-sm font-semibold hover:cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send message"
          title="Send message"
        >
          <span>{isPending ? "Sending…" : "Send message"}</span>
        </button>
      </div>
    </form>
  );
}



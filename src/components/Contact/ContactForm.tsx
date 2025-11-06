"use client";

import React, { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { validateEmail } from "@/utils/auth";
import { sendContact, type ContactActionState } from "@/app/contact/actions";

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
        <div className="rounded-md bg-red-500/10 ring-1 ring-red-600/40 px-3 py-2 text-sm text-red-300">
          {state.error}
        </div>
      )}
      {(state.success && !isPending) && (
        <div className="rounded-md bg-green-500/10 ring-1 ring-green-600/40 px-3 py-2 text-sm text-green-300">
          {state.success}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="topic" className="text-sm text-foreground/80">Topic</label>
        <select
          id="topic"
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as Topic)}
          className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >
          {(Object.keys(topicLabels) as Topic[]).map((key) => (
            <option key={key} value={key}>{topicLabels[key]}</option>
          ))}
        </select>
        <span className="text-xs text-foreground/60">
          Choose the most relevant topic so we can help you better.
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm text-foreground/80">Name (optional)</label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            autoComplete="name"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm text-foreground/80">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              email && emailError ? "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" : "ring-[var(--border)]"
            }`}
            required
            autoComplete="email"
          />
          {email && emailError && (
            <span className="text-xs text-red-500/70">{emailError}</span>
          )}
        </div>
      </div>

      {(topic === "bug" || topic === "creator" || topic === "account") && (
        <div className="grid gap-2">
          <label htmlFor="contextUrl" className="text-sm text-foreground/80">Related URL (optional)</label>
          <input
            id="contextUrl"
            name="contextUrl"
            type="url"
            value={contextUrl}
            onChange={(e) => setContextUrl(e.target.value)}
            placeholder="https://hackdex.app/..."
            className="h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            inputMode="url"
          />
          <span className="text-xs text-foreground/60">Linking the exact page helps us investigate faster.</span>
        </div>
      )}

      <div className="grid gap-2">
        <label htmlFor="message" className="text-sm text-foreground/80">Message</label>
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
          className="min-h-[8rem] rounded-md bg-[var(--surface-2)] px-3 py-2 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid || isPending}
          className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold hover:cursor-pointer disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
          aria-label="Send message"
          title="Send message"
        >
          <span>{isPending ? "Sending…" : "Send message"}</span>
        </button>
      </div>
    </form>
  );
}



"use client";

import React, { useActionState } from "react";
import { ResetActionState, requestPasswordReset } from "@/app/login/actions";

export default function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [state, formAction, isPending] = useActionState<ResetActionState, FormData>(requestPasswordReset, null);
  const emailValid = /.+@.+\..+/.test(email);

  return (
    <form className="grid gap-5 group">
      {state?.ok && !state.error && (
        <div className="rounded-control bg-ready-soft px-3 py-2 text-sm text-ready">
          If that email exists, you'll receive a reset link shortly.
        </div>
      )}
      {state?.ok === false && state.error && (
        <div className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">
          {state.error}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="resetEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`h-11 w-full rounded-control border bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40 ${
            email && !emailValid ?
              "not-focus:border-error" :
              "border-line"
          }`}
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          formAction={formAction}
          disabled={!emailValid || isPending}
          className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent-deep px-5 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Send reset link</span>
        </button>
      </div>
    </form>
  );
}




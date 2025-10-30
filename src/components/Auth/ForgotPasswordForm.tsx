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
        <div className="rounded-md bg-green-500/10 ring-1 ring-green-600/40 px-3 py-2 text-sm text-green-300">
          If that email exists, you'll receive a reset link shortly.
        </div>
      )}
      {state?.ok === false && state.error && (
        <div className="rounded-md bg-red-500/10 ring-1 ring-red-600/40 px-3 py-2 text-sm text-red-300">
          {state.error}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm text-foreground/80">Email</label>
        <input
          id="email"
          name="resetEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
            email && !emailValid ?
              "not-focus:ring-red-600/40 not-focus:bg-red-500/10 dark:not-focus:ring-red-400/40 dark:not-focus:bg-red-950/20" :
              "bg-[var(--surface-2)] ring-[var(--border)]"
          }`}
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          formAction={formAction}
          disabled={!emailValid || isPending}
          className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
        >
          <span>Send reset link</span>
        </button>
      </div>
    </form>
  );
}




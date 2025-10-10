"use client";

import React, { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { AuthActionState, signup } from "@/app/signup/actions";
import { validateEmail, validatePassword } from "@/utils/auth";

export default function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const [state, formAction] = useActionState<AuthActionState, FormData>(signup, { error: null });
  const passwordsMatch = password === confirm;
  const isValid = !emailError && !passwordError && passwordsMatch;

  useEffect(() => {
    const { error } = validateEmail(email);
    setEmailError(error);
  }, [email]);

  useEffect(() => {
    const { error } = validatePassword(password);
    setPasswordError(error);
  }, [password]);

  const redirectTo = searchParams.get("redirectTo");

  return (
    <form className="grid gap-5 group">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
      {(state?.error) && (
        <div className="rounded-md bg-red-500/10 ring-1 ring-red-600/40 px-3 py-2 text-sm text-red-300">
          {state?.error}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm text-foreground/80">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`h-11 rounded-md bg-[var(--surface-2)] px-3 text-sm ring-1 ring-inset ring-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
            email && emailError ?
              "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" :
              "bg-[var(--surface-2)] ring-[var(--border)]"
          }`}
          required
        />
        {email && emailError && (
          <span className="text-xs text-red-500/70">{emailError}</span>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm text-foreground/80">Password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className={`h-11 w-full rounded-md px-3 pr-10 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              password && passwordError ?
                "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" :
                "bg-[var(--surface-2)] ring-[var(--border)]"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        {password && passwordError && (
          <span className="text-xs text-red-500/70">{passwordError}</span>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="confirm" className="text-sm text-foreground/80">Confirm password</label>
        <div className="relative">
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className={`h-11 w-full rounded-md px-3 pr-10 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
              confirm && !passwordsMatch ?
                "ring-red-600/40 bg-red-500/10 dark:ring-red-400/40 dark:bg-red-950/20" :
                "bg-[var(--surface-2)] ring-[var(--border)]"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        {confirm && !passwordsMatch && (
          <span className="text-xs text-red-500/70">Passwords do not match.</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid}
          className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold hover:cursor-pointer dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
        >
          <span>Sign up</span>
        </button>
      </div>
    </form>
  );
}



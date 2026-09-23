"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Turnstile } from "next-turnstile";
import { AuthActionState, signup } from "@/app/signup/actions";
import { useAuthContext } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "@/utils/auth";

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string | undefined>(undefined);
  const [turnstileError, setTurnstileError] = React.useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = React.useState(0);

  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(signup, { error: null });
  const passwordsMatch = password === confirm;
  const isValid = !emailError && !passwordError && passwordsMatch && acceptedTerms;

  // Reset Turnstile token and widget on error to allow retry
  useEffect(() => {
    if (state?.error && !isPending) {
      setTurnstileToken(undefined);
      setTurnstileError(null);
      // Force Turnstile widget to reset by changing key
      setTurnstileKey((prev) => prev + 1);
    }
  }, [state?.error, isPending]);

  useEffect(() => {
    const { error } = validateEmail(email);
    setEmailError(error);
  }, [email]);

  useEffect(() => {
    const { error } = validatePassword(password);
    setPasswordError(error);
  }, [password]);

  const redirectTo = searchParams.get("redirectTo");

  // Redirect if user already authenticated (e.g., opened signup while logged in)
  useEffect(() => {
    if (!user) return;
    const isValidInternalPath = !!redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//');
    const to = isValidInternalPath ? (redirectTo as string) : '/account';
    router.replace(to);
  }, [user, redirectTo, router]);

  return (
    <form className="grid gap-5 group">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
      {(state?.error && !isPending) && (
        <div className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">
          {state?.error}
        </div>
      )}
      {turnstileError && (
        <div className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">
          {turnstileError}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`h-11 w-full rounded-control border bg-surface-2 px-3 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40 ${
            email && emailError ?
              "border-error" :
              "border-line"
          }`}
          required
        />
        {email && emailError && (
          <span className="text-xs text-error">{emailError}</span>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className={`h-11 w-full rounded-control border bg-surface-2 px-3 pr-10 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40 ${
              password && passwordError ?
                "border-error" :
                "border-line"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-control text-text-3 hover:bg-surface hover:text-text"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        {password && passwordError && (
          <span className="text-xs text-error">{passwordError}</span>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="confirm" className="text-sm font-medium">Confirm password</label>
        <div className="relative">
          <input
            id="confirm"
            name="confirm"
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className={`h-11 w-full rounded-control border bg-surface-2 px-3 pr-10 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-3 focus:border-line-strong focus:ring-2 focus:ring-accent/40 ${
              confirm && !passwordsMatch ?
                "border-error" :
                "border-line"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded-control text-text-3 hover:bg-surface hover:text-text"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        {confirm && !passwordsMatch && (
          <span className="text-xs text-error">Passwords do not match.</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-text-2">
        <input
          id="accept-terms"
          name="acceptTerms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="h-4 w-4 accent-[var(--rose-deep)]"
          required
        />
        <label htmlFor="accept-terms" className="space-x-1">
          <span>I agree to the</span>
          <a
            href="/terms"
            className="font-medium text-link-hd"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Service
          </a>
        </label>
      </div>

      <div className="flex flex-col items-center gap-3 mt-2">
        <Turnstile
          key={turnstileKey}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onVerify={(token) => {
            setTurnstileToken(token);
            setTurnstileError(null);
          }}
          onError={(error) => {
            setTurnstileToken(undefined);
            setTurnstileError("Verification failed. Please try again.");
            console.error("Turnstile error:", error);
          }}
          onExpire={() => {
            setTurnstileToken(undefined);
          }}
          theme="auto"
        />
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid || isPending || !turnstileToken}
          className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent-deep px-5 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Sign up</span>
        </button>
      </div>
    </form>
  );
}



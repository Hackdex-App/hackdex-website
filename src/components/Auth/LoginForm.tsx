"use client";

import React, { useActionState, useEffect} from "react";
import Link from "next/link";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Turnstile } from "next-turnstile";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AuthActionState, login } from "@/app/login/actions";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { user, setUser } = useAuthContext();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | undefined>(undefined);
  const [turnstileError, setTurnstileError] = React.useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = React.useState(0);
  const dark = useDarkMode();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [state, formAction] = useActionState<AuthActionState, FormData>(login, null);
  const errorMessage = urlError === "EMAIL_CONFIRMATION_ERROR" ?
    "Email verification failed. Try again or request a new link." :
    state?.error || null;
  const redirectTo = searchParams.get("redirectTo");
  const navigatedRef = React.useRef(false);

  const emailValid = /.+@.+\..+/.test(email);
  const passwordValid = password.length > 1;
  const isValid = emailValid && passwordValid;

  // Reset Turnstile token and widget on error to allow retry
  useEffect(() => {
    if (state?.error && state.error !== null) {
      setTurnstileToken(undefined);
      setTurnstileError(null);
      // Force Turnstile widget to reset by changing key
      setTurnstileKey((prev) => prev + 1);
    }
  }, [state?.error]);

  // Update context and immediately redirect after successful login
  useEffect(() => {
    if (state && state.error === null && !navigatedRef.current) {
      setUser(state.user);
      const to = state.redirectTo || (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard');
      navigatedRef.current = true;
      router.replace(to);
    }
  }, [state, setUser, router, redirectTo]);

  // Redirect when user becomes available in context
  useEffect(() => {
    if (!user || navigatedRef.current) return;
    const isValidInternalPath = !!redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//');
    const to = isValidInternalPath ? (redirectTo as string) : '/dashboard';
    navigatedRef.current = true;
    router.replace(to);
  }, [user, redirectTo, router]);

  return (
    <form className="grid gap-5 group">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
      {(errorMessage) && (
        <div className="rounded-control bg-error-soft px-3 py-2 text-sm text-error">
          {errorMessage}
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
            email && !emailValid ?
              "not-focus:border-error" :
              "border-line"
          }`}
          required
        />
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
              password && !passwordValid ?
                "not-focus:border-error" :
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
      </div>

      <div className="flex justify-end">
        <Link
          href={redirectTo ? `/login/forgot?redirectTo=${encodeURIComponent(redirectTo)}` : "/login/forgot"}
          className="text-xs text-link-hd"
        >
          Forgot your password?
        </Link>
      </div>

      <div className="flex flex-col items-center gap-3">
        {!isValid && (email || password) ? (
          <span className="text-xs text-error h-3 group-has-focus:invisible">Please enter a valid email and password.</span>
        ) : (
          <div className="h-3" />
        )}
        <Turnstile
          // The widget reads its theme once, so a theme change remounts it.
          key={`${turnstileKey}-${dark}`}
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
          theme={dark ? "dark" : "light"}
        />
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid || !turnstileToken}
          className="inline-flex h-11 w-full items-center justify-center rounded-control bg-accent-deep px-5 text-sm font-semibold text-white transition-colors hover:enabled:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>Log in</span>
        </button>
      </div>
    </form>
  );
}



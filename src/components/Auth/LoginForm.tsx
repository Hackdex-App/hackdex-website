"use client";

import React, { useActionState, useEffect} from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { AuthActionState, login } from "@/app/login/actions";
import { redirect, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";

export default function LoginForm() {
  const { setUser } = useAuthContext();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [state, formAction] = useActionState<AuthActionState, FormData>(login, null);
  const errorMessage = urlError === "EMAIL_CONFIRMATION_ERROR" ?
    "Email verification failed. Try again or request a new link." :
    state?.error || null;
  const redirectTo = searchParams.get("redirectTo");

  const emailValid = /.+@.+\..+/.test(email);
  const passwordValid = password.length > 1;
  const isValid = emailValid && passwordValid;

  useEffect(() => {
    if (state && state.error === null) {
      setUser(state.user);
      if (state.redirectTo) {
        redirect(state.redirectTo);
      }
    }
  }, [state]);

  return (
    <form className="grid gap-5 group">
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}
      {(errorMessage) && (
        <div className="rounded-md bg-red-500/10 ring-1 ring-red-600/40 px-3 py-2 text-sm text-red-300">
          {errorMessage}
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
            email && !emailValid ?
              "not-focus:ring-red-600/40 not-focus:bg-red-500/10 dark:not-focus:ring-red-400/40 dark:not-focus:bg-red-950/20" :
              "bg-[var(--surface-2)] ring-[var(--border)]"
          }`}
          required
        />
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
              password && !passwordValid ?
                "not-focus:ring-red-600/40 not-focus:bg-red-500/10 dark:not-focus:ring-red-400/40 dark:not-focus:bg-red-950/20" :
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
      </div>

      <div className="flex flex-col items-center gap-3">
        {!isValid && (email || password) ? (
          <span className="text-xs text-red-500/70 italic h-3 group-has-focus:invisible">Please enter a valid email and password.</span>
        ) : (
          <div className="h-3" />
        )}
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid}
          className="shine-wrap btn-premium h-11 min-w-[7.5rem] text-sm font-semibold dark:disabled:opacity-70 disabled:cursor-not-allowed disabled:[box-shadow:0_0_0_1px_var(--border)]"
        >
          <span>Log in</span>
        </button>
      </div>
    </form>
  );
}



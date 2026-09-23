"use client";

import React, { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { validatePassword } from "@/utils/auth";
import { updatePassword, UpdateState } from "@/app/account/actions";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<UpdateState, FormData>(updatePassword, null);

  const passwordsMatch = password === confirm;
  const isValid = !passwordError && passwordsMatch && confirm.length > 0;

  useEffect(() => {
    const { error } = validatePassword(password);
    setPasswordError(error);
  }, [password]);

  useEffect(() => {
    if (state?.ok) {
      // After password is updated, redirect to account
      router.replace("/account?passwordUpdated=1");
    }
  }, [state, router]);

  return (
    <form className="grid gap-5 group">
      {state?.ok === false && state.error && (
        <div className="rounded-control bg-error-soft ring-1 ring-error/40 px-3 py-2 text-sm text-error">
          {state.error}
        </div>
      )}
      <div className="grid gap-2">
        <label htmlFor="newPassword" className="text-sm text-text-2">New password</label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className={`h-11 w-full rounded-control px-3 pr-10 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              password && passwordError ?
                "ring-error/40 bg-error-soft dark:ring-error/40 dark:bg-error-soft" :
                "bg-surface-2 ring-line"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2"
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
        <label htmlFor="confirmPassword" className="text-sm text-text-2">Confirm new password</label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your new password"
            className={`h-11 w-full rounded-control px-3 pr-10 text-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-accent/40 ${
              confirm && !passwordsMatch ?
                "ring-error/40 bg-error-soft dark:ring-error/40 dark:bg-error-soft" :
                "bg-surface-2 ring-line"
            }`}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center rounded hover:bg-surface-2"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            title={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        </div>
        {confirm && !passwordsMatch && (
          <span className="text-xs text-error">Passwords do not match.</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {!isValid && (password || confirm) ? (
          <span className="text-xs text-error italic h-3 group-has-focus:invisible">Passwords must match and be at least 6 characters.</span>
        ) : (
          <div className="h-3" />
        )}
        <button
          type="submit"
          formAction={formAction}
          disabled={!isValid || isPending}
          className="inline-flex items-center justify-center rounded-control bg-accent-deep px-5 text-white transition-colors hover:enabled:bg-accent-hover disabled:opacity-60 h-11 min-w-[9rem] text-sm font-semibold disabled:cursor-not-allowed"
        >
          <span>Update password</span>
        </button>
      </div>
    </form>
  );
}



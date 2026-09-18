"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
};

const base =
  "inline-flex items-center justify-center rounded-control font-semibold transition-[background-color,transform] duration-[120ms] active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

const variants: Record<string, string> = {
  primary: "bg-accent-deep text-white hover:bg-accent-hover",
  secondary: "bg-surface-2 text-text hover:bg-line",
  ghost: "bg-transparent text-text hover:bg-surface-2",
};

const sizes: Record<string, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...props}
    >
      {isLoading ? (
        <span className="relative">
          <span className="opacity-0">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

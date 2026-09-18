"use client";

import { FiMoon, FiSun } from "react-icons/fi";

export const THEME_STORAGE_KEY = "hackdex-theme";

/**
 * Runs before first paint (see layout.tsx) so the stored choice, or the system
 * preference when nothing is stored, is applied without a flash.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/** Sun/moon button that flips the `dark` class on <html> and remembers the choice. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-control text-text-2 transition-colors hover:bg-surface-2 hover:text-text ${className}`}
      aria-label="Toggle light or dark theme"
      title="Toggle theme"
    >
      {/* Both icons render; CSS picks one, so the server markup is theme-agnostic. */}
      <FiSun className="hidden h-5 w-5 dark:block" />
      <FiMoon className="h-5 w-5 dark:hidden" />
    </button>
  );
}

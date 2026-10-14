import { LuSparkle } from "react-icons/lu";

/**
 * "AI hidden": the sparkle struck through, drawn like Feather's eye-off. A mask cuts a gap
 * around the slash so the two strokes stay apart at small sizes. Size it with `className`.
 */
export default function AiOffIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block flex-none ${className}`} aria-hidden>
      <LuSparkle className="h-full w-full [mask-image:linear-gradient(to_top_right,#000_42%,transparent_42%,transparent_58%,#000_58%)]" />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="absolute inset-0 h-full w-full">
        <path d="M3 3l18 18" />
      </svg>
    </span>
  );
}

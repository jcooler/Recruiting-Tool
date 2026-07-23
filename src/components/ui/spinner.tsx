import { cn } from "@/lib/cn";

export interface SpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Decorative loading indicator. Never conveys state on its own — callers
 * pair it with a visible label (e.g. Button keeps its text while `loading`).
 * Respects `prefers-reduced-motion` via the global rule in app/globals.css
 * (animation-duration is clamped to ~0 there).
 */
export function Spinner({ size = 16, className }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn("animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
};

/**
 * Same visual treatment as `<Button>`, for callers that need an `<a>` (e.g.
 * `next/link`) rather than a `<button>` — `<Button>` always renders a real
 * button element, so nesting a link inside it would produce invalid,
 * non-functional markup (an interactive element inside another one).
 */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

/**
 * `loading` disables the button (prevents double-submits) and swaps in a
 * decorative Spinner ahead of the label — the label itself always stays
 * visible so the loading state never depends on the spinner icon alone.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
});

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// success/warning/danger use dedicated solid --badge-*-bg/fg token pairs
// (app/globals.css), not an opacity-blended --success/--warning/--danger
// wash — the blend's *effective* background (page bg + N% color tint) isn't
// a fixed, contrast-checkable value, and axe caught it failing WCAG AA
// (3.8-4.09:1 against the required 4.5:1) wherever a badge sat on a surface
// slightly different from the one it was eyeballed against. The dedicated
// pairs mirror the already-verified --stage-*-bg/fg pattern (same hex
// values as stage-hired/offer/rejected) and are checked by
// scripts/contrast-check.mjs like every other token pair here.
const VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-text-2",
  accent: "bg-accent-soft text-accent",
  success: "bg-badge-success-bg text-badge-success-fg",
  warning: "bg-badge-warning-bg text-badge-warning-fg",
  danger: "bg-badge-danger-bg text-badge-danger-fg",
};

/** Generic text pill (role labels, counts, etc). For pipeline stages use `StageBadge`. */
export function Badge({ variant = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

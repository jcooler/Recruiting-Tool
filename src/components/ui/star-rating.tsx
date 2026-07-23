"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { IconStar, IconStarFilled, IconX } from "./icons";

export interface StarRatingProps {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
  className?: string;
}

const OPTIONS = [0, 1, 2, 3, 4, 5] as const;

function labelFor(n: number): string {
  return `${n} of 5 stars`;
}

/**
 * Accessible star rating: a real `radiogroup` of six `radio` options (0–5) —
 * not a decorative row of clickable stars. The current value is communicated
 * three independent ways so nothing depends on color or icon shape alone:
 * `aria-checked` state, each option's `aria-label` ("n of 5 stars"), and a
 * persistent visible "n/5" text label next to the group.
 *
 * Keyboard: arrow keys move focus and select in one step (roving tabindex,
 * only the checked option is tabbable) — matching the WAI-ARIA radio group
 * pattern, where selection follows focus rather than requiring a separate
 * activation key.
 */
export function StarRating({ value, onChange, readOnly = false, className }: StarRatingProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const interactive = !readOnly && Boolean(onChange);

  function select(n: number) {
    if (!interactive) return;
    onChange?.(n);
    refs.current[n]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, current: number) {
    if (!interactive) return;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = Math.min(5, current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = Math.max(0, current - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 5;
        break;
      case " ":
      case "Enter":
        next = current;
        break;
      default:
        return;
    }
    e.preventDefault();
    select(next);
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div role="radiogroup" aria-label="Rating" aria-readonly={readOnly || undefined} className="inline-flex items-center gap-0.5">
        {OPTIONS.map((n) => {
          const checked = n === value;
          const filled = n > 0 && n <= value;
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={labelFor(n)}
              tabIndex={interactive ? (checked ? 0 : -1) : -1}
              onClick={() => select(n)}
              onKeyDown={(e) => handleKeyDown(e, n)}
              className={cn(
                "flex size-6 items-center justify-center rounded-md text-text-3 transition-colors",
                interactive &&
                  "hover:text-accent focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                filled && "text-accent",
                readOnly && "cursor-default"
              )}
            >
              {n === 0 ? <IconX size={14} /> : filled ? <IconStarFilled size={16} /> : <IconStar size={16} />}
            </button>
          );
        })}
      </div>
      <span className="text-sm font-medium tabular-nums text-text-2">{value}/5</span>
    </div>
  );
}

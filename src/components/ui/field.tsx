import {
  cloneElement,
  forwardRef,
  isValidElement,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown, IconX } from "./icons";

const CONTROL_BASE =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text " +
  "placeholder:text-text-3 transition-colors " +
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 " +
  "[&[aria-invalid=true]]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(CONTROL_BASE, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(CONTROL_BASE, "resize-y", className)} {...props} />;
  }
);

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(CONTROL_BASE, "appearance-none pr-9", className)}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-3"
        />
      </div>
    );
  }
);

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Chip list + text input for array-of-string fields (candidate skills/tags).
 * The text input is the only real form control here — `id`/`aria-invalid`/
 * `aria-describedby` land on it (not the wrapping div), so `Field`'s
 * `cloneElement` wiring works the same as it does for `Input`/`Textarea`,
 * as long as a caller forwards those same three props through from
 * whatever wrapper sits between `Field` and this component (see
 * `TagField` in `edit-candidate-dialog.tsx`, needed because this is a
 * controlled value/onChange pair driven by react-hook-form's `useController`
 * rather than `register()`, which only binds to native form elements).
 *
 * Commits a chip on Enter or comma, or on blur (so a typed-but-uncommitted
 * chip is never silently lost when focus moves to the next field/button).
 * Backspace on an empty draft removes the most recently added chip — the
 * same shortcut most chip-input implementations use, so it needs no extra
 * affordance to discover. Every chip's remove control also has its own
 * `aria-label` for keyboard/screen-reader users who aren't relying on that
 * shortcut.
 */
export function TagInput({ value, onChange, id, placeholder, className, ...aria }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim();
    setDraft("");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 transition-colors",
        "focus-within:outline-none focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2",
        className
      )}
    >
      {value.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-surface-2 py-0.5 pl-2.5 pr-1 text-xs font-medium text-text-2"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeAt(i)}
            aria-label={`Remove ${tag}`}
            className="flex size-4 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-border hover:text-text focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent"
          >
            <IconX size={10} />
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[10ch] flex-1 border-0 bg-transparent p-1 text-sm text-text placeholder:text-text-3 focus:outline-none"
        {...aria}
      />
    </div>
  );
}

export interface FieldProps {
  label: string;
  error?: string;
  id: string;
  hint?: string;
  children?: ReactNode;
}

/**
 * Labelled form field wrapper. Wires `aria-invalid` / `aria-describedby`
 * onto its single child control via cloneElement, and renders the error
 * message in a `role="alert"` paragraph so screen readers announce it as
 * soon as it appears.
 */
export function Field({ label, error, id, hint, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  const child =
    children && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          id,
          "aria-invalid": Boolean(error) || undefined,
          "aria-describedby": describedBy,
        })
      : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text-2">
        {label}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-3">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

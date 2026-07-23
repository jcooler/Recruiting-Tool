import {
  cloneElement,
  forwardRef,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { IconChevronDown } from "./icons";

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

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { IconX } from "./icons";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Radix Dialog wrapper: focus trap comes free from Radix. Focus *restore*
 * we do ourselves — Radix's own restore only fires when a `Dialog.Trigger`
 * is used (it focuses `context.triggerRef`, which stays null for our
 * trigger-less controlled contract, while also suppressing FocusScope's own
 * fallback restore via `preventDefault()`). So we record whatever was
 * focused right before `open` became true and refocus it on close.
 * `DialogTitle` is always rendered (required for the dialog to have an
 * accessible name) — pass `description` when body copy alone wouldn't make
 * the dialog's purpose obvious to a screen reader user.
 */
export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={
            "fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 " +
            "data-[state=closed]:opacity-0 starting:opacity-0"
          }
        />
        <RadixDialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
          className={
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 " +
            "rounded-lg border border-border bg-surface p-6 shadow-lg outline-none " +
            "transition-all duration-150 " +
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0"
          }
        >
          <RadixDialog.Title className="pr-6 text-base font-semibold text-text">{title}</RadixDialog.Title>
          {description && (
            <RadixDialog.Description className="mt-1 text-sm text-text-2">{description}</RadixDialog.Description>
          )}
          <div className="mt-4">{children}</div>
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          <RadixDialog.Close
            aria-label="Close dialog"
            className={
              "absolute right-4 top-4 rounded-md p-1.5 text-text-3 transition-colors hover:bg-surface-2 hover:text-text " +
              "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            }
          >
            <IconX size={16} />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

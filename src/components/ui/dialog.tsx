"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { IconX } from "./icons";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /**
   * Explicit restore-focus target, for a dialog launched from a dropdown
   * menu item's `onSelect` (job-card/candidate-drawer's Edit/Delete menus)
   * rather than a direct button click. The default behavior below —
   * capturing `document.activeElement` in an effect that runs after `open`
   * flips true — races Radix DropdownMenu's own close/unmount: by the time
   * this effect's render commits, the menu item that called `onSelect` has
   * already started unmounting (Radix closes the menu as part of the same
   * selection), so `document.activeElement` has already fallen through to
   * `<body>` — confirmed live (see task fix-wave report). Pass the
   * dropdown *trigger* button's ref here (not the item — it unmounts; the
   * trigger doesn't) so the caller captures the correct restore target
   * synchronously, inside the same event handler that opens the dialog,
   * before Radix has a chance to move focus anywhere. Omit for dialogs
   * opened by a direct, still-mounted button click (e.g. `JobHeader`'s Edit/
   * Delete buttons, "Add candidate", "New job") — those work correctly with
   * the default `document.activeElement` capture, since nothing unmounts
   * the opener between click and this effect running.
   */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Radix Dialog wrapper: focus trap comes free from Radix. Focus *restore*
 * we do ourselves — Radix's own restore only fires when a `Dialog.Trigger`
 * is used (it focuses `context.triggerRef`, which stays null for our
 * trigger-less controlled contract, while also suppressing FocusScope's own
 * fallback restore via `preventDefault()`). So we record whatever was
 * focused right before `open` became true and refocus it on close — or, for
 * dropdown-launched dialogs where that capture is unreliable, whatever
 * `restoreFocusRef` points to (see its doc comment above).
 * `DialogTitle` is always rendered (required for the dialog to have an
 * accessible name) — pass `description` when body copy alone wouldn't make
 * the dialog's purpose obvious to a screen reader user.
 *
 * The panel is a `max-h`-capped flex column with only the middle (`children`)
 * region scrolling — title and footer stay put. Content this long enough to
 * need it is real (e.g. `AddCandidateDialog`'s full field set after a resume
 * parses, at an ordinary ~720px-tall viewport, genuinely overflows a fixed,
 * unscrollable panel and pushes its own Cancel/Save footer off-screen with
 * no way to reach it — verified live). Same header/scrollable-body/footer
 * split `Drawer` (./drawer.tsx) already uses for the identical problem.
 */
export function Dialog({ open, onOpenChange, title, description, children, footer, restoreFocusRef }: DialogProps) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current =
        restoreFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
  }, [open, restoreFocusRef]);

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
            "fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 " +
            "flex-col rounded-lg border border-border bg-surface shadow-lg outline-none " +
            "transition-all duration-150 " +
            "data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0"
          }
        >
          <div className="shrink-0 p-6 pb-0">
            <RadixDialog.Title className="pr-6 text-base font-semibold text-text">{title}</RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-text-2">{description}</RadixDialog.Description>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-border px-6 py-4 flex justify-end gap-2">{footer}</div>
          )}
          <RadixDialog.Close
            aria-label="Close dialog"
            className={
              "absolute right-4 top-4 rounded-md p-1.5 text-text-3 transition-colors hover:bg-surface-2 hover:text-text " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            }
          >
            <IconX size={16} />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

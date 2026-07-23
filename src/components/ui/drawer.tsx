"use client";

import { useEffect, useRef, type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconX } from "./icons";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

/**
 * Same contract as `Dialog`, but the panel slides in from the right and is
 * full-height (used by the candidate profile). Focus trap comes from Radix;
 * `forceMount` hands mount/unmount timing to Framer Motion's
 * `AnimatePresence` so the exit slide can play before the DOM node is
 * removed. Focus *restore* is handled explicitly (see dialog.tsx for why —
 * Radix's own restore only fires through `Dialog.Trigger`, which our
 * trigger-less controlled contract doesn't use). `useReducedMotion()`
 * collapses the slide to an instant show/hide.
 */
export function Drawer({ open, onOpenChange, title, description, children, footer }: DrawerProps) {
  const reduceMotion = useReducedMotion();
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <RadixDialog.Portal forceMount>
            <RadixDialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              />
            </RadixDialog.Overlay>
            <RadixDialog.Content
              asChild
              forceMount
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                openerRef.current?.focus();
              }}
            >
              <motion.div
                className={
                  "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col " +
                  "border-l border-border bg-surface shadow-lg outline-none"
                }
                initial={{ x: reduceMotion ? 0 : "100%" }}
                animate={{ x: 0 }}
                exit={{ x: reduceMotion ? 0 : "100%" }}
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 34 }
                }
              >
                <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
                  <div className="min-w-0">
                    <RadixDialog.Title className="truncate text-base font-semibold text-text">
                      {title}
                    </RadixDialog.Title>
                    {description && (
                      <RadixDialog.Description className="mt-1 text-sm text-text-2">
                        {description}
                      </RadixDialog.Description>
                    )}
                  </div>
                  <RadixDialog.Close
                    aria-label="Close panel"
                    className={
                      "shrink-0 rounded-md p-1.5 text-text-3 transition-colors hover:bg-surface-2 hover:text-text " +
                      "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    }
                  >
                    <IconX size={16} />
                  </RadixDialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
              </motion.div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        )}
      </AnimatePresence>
    </RadixDialog.Root>
  );
}

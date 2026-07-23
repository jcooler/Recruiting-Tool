"use client";

// The listener half of the toast module (see ./toast.tsx for why this is a
// separate file). Mount once inside Providers — it subscribes to the toast
// queue and renders each item as a Radix `Toast.Root` into the
// `Toast.Viewport` Providers mounts.

import { useSyncExternalStore } from "react";
import * as Toast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";
import { IconCheck, IconX } from "./icons";
import {
  dismissToast,
  getServerToastSnapshot,
  getToastSnapshot,
  subscribeToasts,
  type ToastVariant,
} from "./toast";

const DEFAULT_DURATION = 5000;

const VARIANT_BORDER: Record<ToastVariant, string> = {
  default: "border-border",
  success: "border-success/40",
  error: "border-danger/40",
};

export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToastSnapshot, getServerToastSnapshot);

  return (
    <>
      {items.map((t) => (
        <Toast.Root
          key={t.id}
          type="background"
          role="status"
          duration={DEFAULT_DURATION}
          onOpenChange={(open) => {
            if (!open) dismissToast(t.id);
          }}
          className={cn(
            "rounded-lg border bg-surface p-4 shadow-lg outline-none",
            "transition-[opacity,transform] duration-150",
            "data-[state=closed]:opacity-0 data-[swipe=end]:opacity-0",
            VARIANT_BORDER[t.variant ?? "default"]
          )}
        >
          <div className="flex items-start gap-3">
            {t.variant === "success" && <IconCheck size={16} className="mt-0.5 shrink-0 text-success" />}
            {t.variant === "error" && <IconX size={16} className="mt-0.5 shrink-0 text-danger" />}
            <div className="min-w-0 flex-1">
              <Toast.Title className="text-sm font-medium text-text">{t.title}</Toast.Title>
              {t.description && (
                <Toast.Description className="mt-1 text-sm text-text-2">{t.description}</Toast.Description>
              )}
            </div>
            <Toast.Close
              aria-label="Dismiss"
              className={cn(
                "shrink-0 rounded-md p-1 text-text-3 transition-colors hover:bg-surface-2 hover:text-text",
                "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              )}
            >
              <IconX size={14} />
            </Toast.Close>
          </div>
        </Toast.Root>
      ))}
    </>
  );
}

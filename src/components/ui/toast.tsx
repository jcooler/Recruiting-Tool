// Real implementation — replaces the Task 17 stub. `toast(opts)` is a
// module-level emitter callable from anywhere (event handlers, TanStack
// Query `onError`, outside the React tree). It pushes onto a tiny external
// store that `<Toaster />` (src/components/ui/toaster.tsx, mounted once
// inside Providers) subscribes to via `useSyncExternalStore` and renders as
// Radix `Toast.Root` items into the `Toast.Viewport` Providers already
// mounts.
//
// This file is deliberately JSX-free: `src/hooks/queries.ts` imports
// `toast` from this exact path, and that import is exercised by the unit
// test suite under Vitest's plain esbuild transform, which (correctly,
// mirroring Next's own compiler) reads `tsconfig.json`'s `"jsx": "preserve"`
// and therefore can't parse literal JSX in anything it transitively loads.
// The `<Toaster />` component and its JSX live in ./toaster.tsx instead, so
// nothing reachable from `toast` pulls JSX into the test graph.

export type ToastVariant = "default" | "error" | "success";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

const EMPTY_TOASTS: ToastItem[] = [];
let toasts: ToastItem[] = EMPTY_TOASTS;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Subscribe to toast-queue changes. Used by `<Toaster />` via `useSyncExternalStore`. */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToastSnapshot(): ToastItem[] {
  return toasts;
}

export function getServerToastSnapshot(): ToastItem[] {
  // Toasts are always user-triggered client-side interactions, so there is
  // never a legitimate toast queue during SSR — keep the snapshot a stable
  // empty reference to avoid hydration mismatches.
  return EMPTY_TOASTS;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `toast-${seq}`;
}

/**
 * Queues a toast. Keep the signature stable — `useMoveStage`'s `onError`
 * handler (src/hooks/queries.ts) calls this directly.
 */
export function toast(opts: ToastOptions): void {
  toasts = [...toasts, { id: nextId(), ...opts }];
  emit();
}

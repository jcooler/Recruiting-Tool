// STUB — placeholder for Task 18.
//
// Task 18 owns the real toast system: a store/hook that tracks the active
// toast list and renders `<Toast.Root>` items (from `@radix-ui/react-toast`)
// inside the `<Toast.Viewport>` mounted by `src/components/providers.tsx`.
//
// Task 17 only needs *something* importable as `toast(...)` so that
// `useMoveStage`'s `onError` handler (src/hooks/queries.ts) has a call
// target. This implementation intentionally does nothing but log — replace
// it wholesale in Task 18, do not try to preserve this file's internals.

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "error" | "success";
}

export function toast(opts: ToastOptions): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[toast:stub:${opts.variant ?? "default"}]`, opts.title, opts.description ?? "");
  }
}

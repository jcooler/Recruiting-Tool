"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/queries";
import { ApiClientError } from "@/lib/api-client";
import { Spinner } from "@/components/ui/spinner";

/**
 * Gatekeeper for everything under `app/(app)`. The httpOnly session cookie
 * (set by `/api/users/login`) is the real source of truth — this component
 * only reflects that state into the UI: block on the `me` fetch, bounce to
 * `/login` on a 401, otherwise let the shell render.
 *
 * Not a route guard in the middleware sense: there's a one-request window
 * where an unauthenticated visitor sees the loading spinner before the
 * redirect fires. That's an accepted tradeoff for a client-only gate (no
 * middleware/edge session check exists in this app), same as the rest of
 * this API's auth model.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoading, isError, error } = useMe();
  const unauthorized = isError && error instanceof ApiClientError && error.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace("/login");
  }, [unauthorized, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg" role="status" aria-live="polite">
        <Spinner size={28} />
        <span className="sr-only">Loading your workspace…</span>
      </div>
    );
  }

  if (unauthorized) {
    // The redirect above is in flight — render nothing rather than flash
    // authenticated chrome with no user data behind it.
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg" role="status" aria-live="polite">
        <Spinner size={28} />
        <span className="sr-only">Redirecting to sign in…</span>
      </div>
    );
  }

  return <>{children}</>;
}

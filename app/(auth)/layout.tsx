"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/queries";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Same badge + wordmark treatment as the marketing nav (src/components/marketing/landing.tsx) and the app sidebar. */
function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
        AW
      </span>
      <span className="text-sm font-semibold tracking-tight text-text">ApplicantWizard</span>
    </Link>
  );
}

/**
 * Shared chrome for `/login` and `/signup`: a top bar (wordmark + theme
 * toggle) over a centered card. Unlike `AuthGate` (app/(app)/layout.tsx),
 * which blocks rendering on `useMe` before showing anything, this layout
 * renders `children` unconditionally — these are the pages a signed-out
 * visitor must always be able to see and use immediately, loading state or
 * not. A visitor who's actually already signed in (a stale bookmark, a
 * second tab) is bounced to `/dashboard` once `useMe` resolves; until then
 * they simply see the form for a moment, which is harmless.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isSuccess } = useMe();

  useEffect(() => {
    if (isSuccess) router.replace("/dashboard");
  }, [isSuccess, router]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="relative w-full max-w-[26rem]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative rounded-xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-9">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

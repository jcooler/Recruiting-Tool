import type { ReactNode } from "react";
import { AuthGate } from "@/components/shell/auth-gate";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Server-component layout for every authenticated route. `AuthGate` and
 * `AppShell` are themselves client components (they need hooks/state), but
 * this thin wrapper doesn't — keeping it a server component avoids shipping
 * an extra client boundary for what is otherwise a no-op pass-through.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}

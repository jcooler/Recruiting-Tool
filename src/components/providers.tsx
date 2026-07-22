"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkeletonTheme } from "react-loading-skeleton";
import * as Toast from "@radix-ui/react-toast";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SkeletonTheme baseColor="var(--skeleton-base)" highlightColor="var(--skeleton-highlight)">
        {/*
          Toast.Provider + Toast.Viewport are the structural seam for Task 18.
          `src/components/ui/toast.tsx` is currently a no-op stub (no toast
          state), so there are no <Toast.Root> children to render yet — Task
          18 adds a toast-list hook/store and renders <Toast.Root> items here
          (or via a <Toaster /> placed inside this provider) so they portal
          into the viewport below.
        */}
        <Toast.Provider swipeDirection="right">
          {children}
          <Toast.Viewport
            style={{
              position: "fixed",
              bottom: 16,
              right: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: 360,
              maxWidth: "calc(100vw - 32px)",
              margin: 0,
              padding: 0,
              listStyle: "none",
              zIndex: 2147483647,
              outline: "none",
            }}
          />
        </Toast.Provider>
      </SkeletonTheme>
    </QueryClientProvider>
  );
}

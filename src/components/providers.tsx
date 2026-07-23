"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SkeletonTheme } from "react-loading-skeleton";
import * as Toast from "@radix-ui/react-toast";
import { Toaster } from "@/components/ui/toaster";

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
        <Toast.Provider swipeDirection="right">
          {children}
          <Toaster />
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

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeScript } from "@/components/theme/theme-script";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplicantWizard",
  description: "A modern applicant tracking system.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = raw === "light" || raw === "dark" ? raw : undefined;

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}

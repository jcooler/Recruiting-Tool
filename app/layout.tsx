import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme/theme-script";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const DESCRIPTION =
  "The applicant tracking system for hiring teams who'd rather be interviewing than exporting spreadsheets. Pipeline board, resume parsing, and hiring analytics in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "ApplicantWizard — modern applicant tracking",
    template: "%s · ApplicantWizard",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "ApplicantWizard — modern applicant tracking",
    description: DESCRIPTION,
    siteName: "ApplicantWizard",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApplicantWizard — modern applicant tracking",
    description: DESCRIPTION,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = raw === "light" || raw === "dark" ? raw : undefined;

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplicantWizard",
  description: "A modern applicant tracking system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

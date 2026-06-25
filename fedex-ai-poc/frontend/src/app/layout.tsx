import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuantixAI — Intelligent Analytics",
  description: "Ask questions, get instant analytics insights powered by QuantixAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}

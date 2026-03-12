import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Ship } from "lucide-react";
import { AnalyticsNav } from "@/components/analytics-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lineup Dashboard Pro",
  description: "Vessel lineup tracking dashboard for Brazilian ports",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b bg-background">
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="flex items-center justify-between gap-4 py-2">
              <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
                <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
                  <Ship className="h-5 w-5" />
                  <span className="hidden sm:inline">Lineup Dashboard</span>
                </Link>
                <AnalyticsNav />
              </div>
              <Link
                href="/admin/upload"
                className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

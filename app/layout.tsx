import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "SharedLife — Split shared household expenses",
  description:
    "Track who paid for what in your household and settle up with the fewest payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl px-5 py-4 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm">
                SL
              </span>
              SharedLife
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-3xl px-5 py-6 text-xs text-black/40 dark:text-white/40">
          SharedLife · shared household expenses made simple
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClawForge | AI-Powered Smart Contract Auditor",
  description:
    "Security audit your BNB Chain smart contracts with AI + static analysis. On-chain proof-of-audit NFTs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        <Providers>
          <header className="border-b border-gray-800">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
              <a href="/" className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                ClawForge
              </a>
              <div className="flex gap-6 text-sm text-gray-400">
                <a href="/" className="hover:text-white transition-colors">Audit</a>
                <a href="/explore" className="hover:text-white transition-colors">Explorer</a>
              </div>
            </nav>
          </header>
          <main className="container mx-auto px-6 py-8">{children}</main>
          <footer className="border-t border-gray-800 mt-16">
            <div className="container mx-auto px-6 py-6 text-center text-gray-500 text-sm">
              ClawForge v1.0 — Built for Good Vibes Only: OpenClaw Edition on BNB Chain
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

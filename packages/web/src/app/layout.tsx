import type { Metadata } from "next";
import localFont from "next/font/local";
import Image from "next/image";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Providers>
          <div className="glow-bg" />
          <div className="relative z-10">
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0b0b0e]/80 border-b border-white/[0.04]">
              <nav className="max-w-[1200px] mx-auto px-6 h-16 flex justify-between items-center">
                <a href="/" className="flex items-center gap-2.5 group">
                  <Image src="/clawforge.png" alt="ClawForge" width={32} height={32}
                    className="group-hover:scale-105 transition-transform" />
                  <span className="text-lg font-semibold text-gold-gradient">ClawForge</span>
                </a>
                <div className="flex items-center gap-1">
                  <a href="/"
                    className="px-4 py-2 text-sm text-[#9999aa] hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors">
                    Audit
                  </a>
                  <a href="/explore"
                    className="px-4 py-2 text-sm text-[#9999aa] hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors">
                    Explorer
                  </a>
                  <a href="https://github.com/obseasd/clawforge" target="_blank" rel="noopener noreferrer"
                    className="ml-2 p-2 text-[#9999aa] hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                    aria-label="GitHub">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                </div>
              </nav>
            </header>

            <main className="max-w-[1200px] mx-auto px-6 py-8 min-h-[calc(100vh-8rem)]">
              {children}
            </main>

            <footer className="border-t border-white/[0.04]">
              <div className="max-w-[1200px] mx-auto px-6 py-5 flex justify-between items-center text-xs text-[#555566]">
                <span>ClawForge v1.0</span>
                <span>Built on BNB Chain</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

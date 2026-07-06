import React              from 'react';
import type { Metadata }  from 'next';
import './globals.css';
import { Nav }            from '@/components/Nav';
import { WalletProvider } from '@/lib/wallet-context';

export const metadata: Metadata = {
  title:       'Tradeline — Milestone Escrow for Freelancers',
  description: 'Global freelance marketplace on Stellar Soroban. Lock milestone payments in escrow, get paid instantly on approval.',
  keywords:    ['escrow', 'freelance', 'stellar', 'soroban', 'USDC', 'blockchain'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">
        <WalletProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="mt-20 border-t border-slate-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-slate-400">
              <span>© 2026 Tradeline · Built on Stellar Soroban</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Testnet
              </span>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}

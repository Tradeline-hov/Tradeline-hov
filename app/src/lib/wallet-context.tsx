'use client';

/**
 * Tradeline — Wallet Context
 *
 * Provides a connected Stellar address to all child components.
 *
 * Demo mode: accepts any Stellar address (G…) directly.
 * Production: swap the `connect` implementation for Freighter or Albedo.
 *
 * ⚠️  Never store a real mainnet secret key in browser state.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WalletState {
  /** Connected Stellar public key, or null if not connected */
  publicKey:   string | null;
  /** True while a connection attempt is in progress */
  connecting:  boolean;
  /** Connect with a Stellar address or testnet secret */
  connect:     (input: string) => void;
  disconnect:  () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletState>({
  publicKey:  null,
  connecting: false,
  connect:    () => {},
  disconnect: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey,  setPublicKey]  = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setConnecting(true);

    // Accept G… addresses directly (demo / read-only mode)
    if (trimmed.startsWith('G') && trimmed.length === 56) {
      setPublicKey(trimmed);
      setConnecting(false);
      return;
    }

    // Accept S… secret keys (testnet only)
    if (trimmed.startsWith('S') && trimmed.length === 56) {
      // Derive public key from secret (simple prefix swap for demo)
      // In production, use Keypair.fromSecret(trimmed).publicKey()
      setPublicKey('GDEMO' + trimmed.slice(5, 51).toUpperCase());
      setConnecting(false);
      return;
    }

    alert('Enter a valid Stellar address (G…) or testnet secret (S…)');
    setConnecting(false);
  }, []);

  const disconnect = useCallback(() => setPublicKey(null), []);

  return (
    <WalletContext.Provider value={{ publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWallet(): WalletState {
  return useContext(WalletContext);
}

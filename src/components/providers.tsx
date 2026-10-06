"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { InternalAction, WalletSelector, Action } from "@near-wallet-selector/core";

type WalletTransaction = { receiverId: string; actions: InternalAction[] };
type WalletContextValue = {
  accountId: string | null;
  ready: boolean;
  connect: () => void;
  disconnect: () => Promise<void>;
  sendTransaction: (transaction: WalletTransaction) => Promise<unknown>;
  sendTransactions: (transactions: WalletTransaction[]) => Promise<unknown>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("WalletProvider is missing");
  return context;
}

type WatchlistContextValue = {
  visitorId: string | null;
  saved: string[];
  toggle: (token: string) => Promise<void>;
};
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("WatchlistProvider is missing");
  return context;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<{ show: () => void; hide: () => void } | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function init() {
      try {
        const [{ setupWalletSelector }, { setupMyNearWallet }, { setupMeteorWallet }, { setupModal }] = await Promise.all([
          import("@near-wallet-selector/core"),
          import("@near-wallet-selector/my-near-wallet"),
          import("@near-wallet-selector/meteor-wallet"),
          import("@near-wallet-selector/modal-ui"),
        ]);
        const selector = await setupWalletSelector({ network: "mainnet", modules: [setupMyNearWallet(), setupMeteorWallet()] });
        if (!active) return;
        selectorRef.current = selector;
        const update = () => setAccountId(selector.store.getState().accounts.find((a) => a.active)?.accountId || selector.store.getState().accounts[0]?.accountId || null);
        update();
        const subscription = selector.store.observable.subscribe(update);
        unsubscribe = () => subscription.unsubscribe();
        modalRef.current = setupModal(selector, { contractId: "nearlytrade.near" });
        setReady(true);
      } catch (error) {
        console.error("Wallet initialization:", error);
        if (active) setReady(true);
      }
    }
    init();
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    let id = window.localStorage.getItem("nearcore-visitor-id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID();
      window.localStorage.setItem("nearcore-visitor-id", id);
    }
    setVisitorId(id);
    fetch(`/api/watchlist?visitorId=${encodeURIComponent(id)}`).then((res) => res.json()).then((data) => {
      if (Array.isArray(data.tokens)) setSaved(data.tokens);
    }).catch(() => {});
  }, []);

  const connect = useCallback(() => {
    if (modalRef.current) modalRef.current.show();
    else window.alert("Wallet sedang disiapkan. Coba lagi sebentar.");
  }, []);

  const disconnect = useCallback(async () => {
    if (!selectorRef.current) return;
    const wallet = await selectorRef.current.wallet();
    await wallet.signOut();
    setAccountId(null);
  }, []);

  const sendTransaction = useCallback(async (transaction: WalletTransaction) => {
    if (!selectorRef.current?.isSignedIn()) throw new Error("Hubungkan wallet NEAR terlebih dahulu.");
    const wallet = await selectorRef.current.wallet();
    return wallet.signAndSendTransaction({ receiverId: transaction.receiverId, actions: transaction.actions as unknown as Action[] });
  }, []);

  const sendTransactions = useCallback(async (transactions: WalletTransaction[]) => {
    if (!selectorRef.current?.isSignedIn()) throw new Error("Hubungkan wallet NEAR terlebih dahulu.");
    const wallet = await selectorRef.current.wallet();
    return wallet.signAndSendTransactions({ transactions: transactions.map((tx) => ({ receiverId: tx.receiverId, actions: tx.actions as unknown as Action[] })) });
  }, []);

  const toggle = useCallback(async (token: string) => {
    if (!visitorId) return;
    const wasSaved = saved.includes(token);
    setSaved((current) => wasSaved ? current.filter((item) => item !== token) : [...current, token]);
    try {
      const response = await fetch("/api/watchlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitorId, token }) });
      if (!response.ok) throw new Error("Watchlist tidak tersimpan");
      const data = await response.json();
      setSaved((current) => data.active ? [...new Set([...current, token])] : current.filter((item) => item !== token));
    } catch {
      setSaved((current) => wasSaved ? [...new Set([...current, token])] : current.filter((item) => item !== token));
    }
  }, [visitorId, saved]);

  return (
    <WalletContext.Provider value={{ accountId, ready, connect, disconnect, sendTransaction, sendTransactions }}>
      <WatchlistContext.Provider value={{ visitorId, saved, toggle }}>
        {children}
      </WatchlistContext.Provider>
    </WalletContext.Provider>
  );
}

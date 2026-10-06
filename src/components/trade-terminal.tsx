"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleAlert, ExternalLink, Heart, Info, LoaderCircle, LockKeyhole, RotateCw, Settings2, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { MarketIcon } from "@/components/market-view";
import { useWallet, useWatchlist } from "@/components/providers";
import { compactNumber, fromUnits, percent, shortAddress, usd, YOCTO } from "@/lib/format";
import type { Market, TradeQuote } from "@/lib/types";

type Balance = {
  availableNear: string; availableNearRaw: string;
  tokenBalance: string; tokenBalanceRaw: string;
  wrappedNear: string; wrappedNearRaw: string;
  tokenRegistered: boolean; wrappedRegistered: boolean;
  tokenStorageMin: string; wrappedStorageMin: string;
};

function safeLink(url: string | null | undefined) {
  return url && /^https:\/\//i.test(url) ? url : null;
}

function action(methodName: string, args: object, gas: string, deposit: string) {
  return { type: "FunctionCall" as const, params: { methodName, args, gas, deposit } };
}

export function TradeTerminal({ market }: { market: Market }) {
  const { accountId, connect, sendTransaction, sendTransactions } = useWallet();
  const { saved, toggle } = useWatchlist();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [txHash, setTxHash] = useState("");
  const [chartLoaded, setChartLoaded] = useState(false);
  const [chartMode, setChartMode] = useState<"chart" | "info">("chart");

  const fetchBalance = useCallback(async () => {
    if (!accountId) { setBalance(null); return; }
    try {
      const response = await fetch(`/api/balance?account=${encodeURIComponent(accountId)}&token=${encodeURIComponent(market.token)}`, { cache: "no-store" });
      if (response.ok) setBalance(await response.json());
    } catch { /* Balance is optional until the wallet signs. */ }
  }, [accountId, market.token]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  useEffect(() => {
    setQuote(null);
    setQuoteError("");
    if (!amount || !/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setQuoting(true);
      try {
        const url = `/api/quote?token=${encodeURIComponent(market.token)}&side=${side}&amount=${encodeURIComponent(amount)}&slippage=${slippage}`;
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not get a quote");
        setQuote(data);
      } catch (error) {
        if (!controller.signal.aborted) setQuoteError(error instanceof Error ? error.message : "Quote unavailable");
      } finally { if (!controller.signal.aborted) setQuoting(false); }
    }, 450);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [amount, side, slippage, market.token]);

  const setMax = () => {
    if (!accountId) { connect(); return; }
    if (!balance) { setNotice("Balance masih dimuat dari NEAR. Coba lagi sebentar."); return; }
    if (side === "sell") {
      setAmount(balance.tokenBalance);
      return;
    }
    const registration = balance.tokenRegistered ? 0n : BigInt(balance.tokenStorageMin);
    const max = BigInt(balance.availableNearRaw) - YOCTO / 4n - registration;
    setAmount(max > 0n ? fromUnits(max, 24, 4) : "0");
  };

  const swapSides = () => { setSide(side === "buy" ? "sell" : "buy"); setAmount(""); setQuote(null); setNotice(""); };

  const trade = async () => {
    if (!accountId) { connect(); return; }
    if (!quote || busy) return;
    setBusy(true); setNotice(""); setTxHash("");
    try {
      const url = `/api/quote?token=${encodeURIComponent(market.token)}&side=${side}&amount=${encodeURIComponent(amount)}&slippage=${slippage}`;
      const response = await fetch(url, { cache: "no-store" });
      const fresh = await response.json() as TradeQuote & { error?: string };
      if (!response.ok) throw new Error(fresh.error || "Quote changed. Please try again.");
      if (!balance) throw new Error("Wallet balance is loading. Try again shortly.");
      const txs: { receiverId: string; actions: ReturnType<typeof action>[] }[] = [];
      if (side === "buy") {
        const storage = balance.tokenRegistered ? 0n : BigInt(balance.tokenStorageMin);
        if (BigInt(balance.availableNearRaw) < BigInt(fresh.amountInRaw) + storage + YOCTO / 20n) throw new Error("Not enough NEAR. Leave at least 0.05 NEAR for gas and storage.");
        if (!balance.tokenRegistered) txs.push({ receiverId: market.token, actions: [action("storage_deposit", { account_id: accountId, registration_only: true }, "30000000000000", balance.tokenStorageMin)] });
        txs.push({ receiverId: "wrap.near", actions: [action("near_deposit", {}, "30000000000000", fresh.amountInRaw)] });
        txs.push({ receiverId: "wrap.near", actions: [action("ft_transfer_call", {
          receiver_id: "dclv2.ref-labs.near", amount: fresh.amountInRaw,
          msg: JSON.stringify({ Swap: { pool_ids: [fresh.poolId], output_token: market.token, min_output_amount: fresh.minOutputRaw } }),
        }, "180000000000000", "1")] });
      } else {
        if (BigInt(balance.tokenBalanceRaw) < BigInt(fresh.amountInRaw)) throw new Error(`Not enough ${market.symbol} in your wallet.`);
        if (!balance.wrappedRegistered) txs.push({ receiverId: "wrap.near", actions: [action("storage_deposit", { account_id: accountId, registration_only: true }, "30000000000000", balance.wrappedStorageMin)] });
        txs.push({ receiverId: market.token, actions: [action("ft_transfer_call", {
          receiver_id: "dclv2.ref-labs.near", amount: fresh.amountInRaw,
          msg: JSON.stringify({ Swap: { pool_ids: [fresh.poolId], output_token: "wrap.near", min_output_amount: fresh.minOutputRaw } }),
        }, "180000000000000", "1")] });
      }
      setNotice("Approve the transaction in your NEAR wallet. Please wait for confirmation.");
      const outcome = await sendTransactions(txs);
      const results = Array.isArray(outcome) ? outcome : outcome ? [outcome] : [];
      const last = results[results.length - 1] as { transaction?: { hash?: string } } | undefined;
      if (last?.transaction?.hash) setTxHash(last.transaction.hash);
      setNotice(side === "sell" ? "Trade submitted. You receive wNEAR, which you can unwrap below." : "Trade submitted to NEAR. View your transaction on the explorer.");
      setAmount(""); setQuote(null);
      setTimeout(fetchBalance, 2200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Transaction was not completed.");
    } finally { setBusy(false); }
  };

  const unwrap = async () => {
    if (!balance || BigInt(balance.wrappedNearRaw || "0") === 0n || busy) return;
    setBusy(true); setNotice("");
    try {
      await sendTransaction({ receiverId: "wrap.near", actions: [action("near_withdraw", { amount: balance.wrappedNearRaw }, "30000000000000", "1")] });
      setNotice("Unwrap submitted. Your NEAR will appear in your wallet shortly.");
      setTimeout(fetchBalance, 2200);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not unwrap wNEAR."); }
    finally { setBusy(false); }
  };

  const isSaved = saved.includes(market.token);

  return <main className="inner-page trade-page"><div className="inner-page-aura" /><div className="content-width trade-layout">
    <div className="breadcrumbs"><Link href="/markets"><ArrowLeft size={14} /> Markets</Link><span>/</span><strong>{market.symbol}</strong></div>
    <div className="trade-asset-header"><div className="trade-asset-main"><MarketIcon market={market} size="large"/><div><div className="trade-asset-title"><h1>{market.name}</h1><span className="token-symbol">${market.symbol}</span><span className="token-live"><span className="live-dot" /> LIVE</span></div><div className="trade-asset-meta">by {shortAddress(market.creator)} <span>·</span> NEAR / Rhea pool <span>·</span> {compactNumber(market.holders)} holders</div></div></div><div className="trade-asset-actions"><button type="button" className={`icon-button ${isSaved ? "is-saved" : ""}`} title="Toggle watchlist" onClick={() => toggle(market.token)}><Heart size={18} fill={isSaved ? "currentColor" : "none"}/></button><a className="icon-button" title="View on NEAR Blocks" href={`https://nearblocks.io/address/${market.token}`} target="_blank" rel="noreferrer"><ExternalLink size={17}/></a></div></div>
    <div className="token-stat-strip"><div><span>PRICE</span><strong>{usd(market.priceUsd)}</strong></div><div><span>24H CHANGE</span><strong className={market.change24h >= 0 ? "positive-text" : "negative-text"}>{percent(market.change24h)}</strong></div><div><span>MARKET CAP</span><strong>{usd(market.marketCapUsd, true)}</strong></div><div><span>24H VOLUME</span><strong>{usd(market.volume24hUsd, true)}</strong></div><div><span>HOLDERS</span><strong>{compactNumber(market.holders)}</strong></div></div>

    <div className="trade-columns"><div className="trade-main-column">
      <div className="chart-panel"><div className="panel-heading"><div className="chart-tabs"><button className={chartMode === "chart" ? "active" : ""} onClick={() => setChartMode("chart")} type="button">Price chart</button><button className={chartMode === "info" ? "active" : ""} onClick={() => setChartMode("info")} type="button">About token</button></div><a href={`https://dexscreener.com/near/${market.token}`} target="_blank" rel="noreferrer">Open full chart <ArrowUpRight size={14}/></a></div>
        {chartMode === "chart" ? <div className="chart-embed-wrap">{!chartLoaded && <div className="chart-loading"><LoaderCircle size={22} className="spin-icon"/><span>Loading live chart...</span></div>}<iframe onLoad={() => setChartLoaded(true)} title={`${market.symbol} price chart`} src={`https://dexscreener.com/near/${market.token}?embed=1&theme=dark&trades=0&info=0`} loading="lazy" /></div> : <div className="token-about"><span className="eyebrow">ABOUT THIS TOKEN</span><h2>{market.name}</h2><p>{market.description || "An independent token launched on the NEAR network."}</p><div className="token-about-row"><span>Token address</span><a href={`https://nearblocks.io/address/${market.token}`} target="_blank" rel="noreferrer">{market.token} <ArrowUpRight size={14}/></a></div><div className="token-about-row"><span>Creator</span><strong>{market.creator}</strong></div><div className="token-about-row"><span>Pool</span><strong>Rhea DCL · 1% fee</strong></div></div>}
      </div>
      <div className="trade-info-cards"><div className="trade-info-card"><span className="info-card-icon"><LockKeyhole size={19}/></span><div><strong>Liquidity locked</strong><p>The launch pool&apos;s position is held by the Nearly locker. It cannot be withdrawn.</p></div></div><div className="trade-info-card"><span className="info-card-icon"><ShieldCheck size={19}/></span><div><strong>Your wallet, your trade</strong><p>Your transaction is signed in your NEAR wallet. GHOSTFUN never holds your funds.</p></div></div></div>
      {(safeLink(market.links.website) || safeLink(market.links.twitter) || safeLink(market.links.telegram)) && <div className="token-links"><span>OFFICIAL LINKS</span>{safeLink(market.links.website) && <a href={safeLink(market.links.website)!} target="_blank" rel="noreferrer">Website <ArrowUpRight size={14}/></a>}{safeLink(market.links.twitter) && <a href={safeLink(market.links.twitter)!} target="_blank" rel="noreferrer">X / Twitter <ArrowUpRight size={14}/></a>}{safeLink(market.links.telegram) && <a href={safeLink(market.links.telegram)!} target="_blank" rel="noreferrer">Telegram <ArrowUpRight size={14}/></a>}</div>}
    </div>
    <aside className="swap-card"><div className="swap-card-top"><div><span className="live-dot" /> TRADE ON NEAR</div><button className="swap-settings" type="button" title="Slippage settings" onClick={() => setShowSettings(!showSettings)}><Settings2 size={18}/></button></div>
      <div className="swap-tabs"><button className={side === "buy" ? "active buy-active" : ""} type="button" onClick={() => { setSide("buy"); setAmount(""); setQuote(null); }}>Buy</button><button className={side === "sell" ? "active sell-active" : ""} type="button" onClick={() => { setSide("sell"); setAmount(""); setQuote(null); }}>Sell</button></div>
      {showSettings && <div className="slippage-panel"><div><strong>Slippage tolerance</strong><span>Max price movement</span></div><div className="slippage-options">{[0.5, 1, 2, 3].map((value) => <button type="button" className={slippage === value ? "active" : ""} key={value} onClick={() => setSlippage(value)}>{value}%</button>)}</div></div>}
      <div className="swap-fields"><div className="swap-input-box"><div className="swap-input-top"><span>You pay</span><span>Balance: {accountId ? (side === "buy" ? balance?.availableNear ?? "..." : balance?.tokenBalance ?? "...") : "—"}</span></div><div className="swap-input-middle"><input type="text" inputMode="decimal" placeholder="0.0" aria-label="Amount to trade" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}/><span className="swap-currency">{side === "buy" ? <span className="near-coin-badge"><img src="/logos/near.png" alt="NEAR" width={22} height={22} /></span> : <MarketIcon market={market} />}{side === "buy" ? "NEAR" : market.symbol}<ChevronDown size={13}/></span></div><div className="swap-input-bottom"><span>{amount && market.nearUsd && side === "buy" ? `≈ ${usd(Number(amount) * market.nearUsd)}` : ""}</span><button type="button" onClick={setMax}>MAX</button></div></div>
        <button type="button" className="swap-direction" onClick={swapSides} aria-label="Swap buy and sell"><ArrowDownUp size={17}/></button>
        <div className="swap-input-box receive-box"><div className="swap-input-top"><span>You receive <small>(estimated)</small></span><span>At pool price</span></div><div className="swap-input-middle"><strong>{quoting ? <LoaderCircle size={19} className="spin-icon"/> : quote ? quote.output : "0.0"}</strong><span className="swap-currency">{side === "buy" ? <MarketIcon market={market}/> : <span className="near-coin-badge"><img src="/logos/near.png" alt="NEAR" width={22} height={22} /></span>}{side === "buy" ? market.symbol : "wNEAR"}</span></div><div className="swap-input-bottom"><span>{quote && side === "sell" ? `≈ ${usd(Number(quote.output) * market.nearUsd)}` : ""}</span></div></div></div>
      {quoteError && <div className="trade-error"><CircleAlert size={15}/>{quoteError}</div>}
      <div className="swap-summary"><div><span>Rhea pool fee <Info size={13}/></span><strong>1%</strong></div><div><span>Token tax</span><strong>{quote ? `${(side === "buy" ? quote.buyTaxBps : quote.sellTaxBps) / 100}%` : "—"}</strong></div><div><span>Slippage tolerance</span><strong>{slippage}%</strong></div><div><span>Minimum received</span><strong>{quote ? `${quote.minimum} ${quote.outputSymbol}` : "—"}</strong></div>{quote?.priceImpact != null && <div><span>Est. price impact</span><strong>{quote.priceImpact.toFixed(2)}%</strong></div>}</div>
      <button type="button" className={`swap-submit ${side === "sell" ? "swap-submit-sell" : ""}`} disabled={busy || (Boolean(accountId) && (!quote || quoting))} onClick={trade}>{busy ? <><LoaderCircle size={17} className="spin-icon" /> Confirming...</> : !accountId ? <><Wallet size={17}/> Connect Wallet</> : !amount ? `Enter an amount to ${side}` : quoting ? "Getting quote..." : <>{`Review ${side}`} <ArrowRight size={18}/></>}</button>
      {notice && <div className={`trade-notice ${txHash ? "success" : ""}`}>{txHash ? <Check size={16}/> : <Info size={16}/>}<span>{notice}{txHash && <a href={`https://nearblocks.io/txns/${txHash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={13}/></a>}</span></div>}
      {balance && BigInt(balance.wrappedNearRaw || "0") > 0n && <button type="button" className="unwrap-button" onClick={unwrap} disabled={busy}><RotateCw size={14}/> Unwrap {balance.wrappedNear} wNEAR to NEAR</button>}
      <div className="swap-footnote"><LockKeyhole size={13}/> Swap executes on Rhea. You always approve in your wallet.</div>
    </aside></div>
    <div className="trade-bottom-notice"><ShieldCheck size={16}/><span>Trade with care. Quotes update with market conditions. Token tax and network gas may apply.</span></div>
  </div></main>;
}

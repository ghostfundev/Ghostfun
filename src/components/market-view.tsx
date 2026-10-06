"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, Clock3, Flame, Heart, RotateCw, Search, Star, TrendingUp } from "lucide-react";
import { useWatchlist } from "@/components/providers";
import { compactNumber, percent, usd } from "@/lib/format";
import type { Market, NetworkStats } from "@/lib/types";

export function MarketIcon({ market, size = "normal" }: { market: Market; size?: "normal" | "large" }) {
  const [broken, setBroken] = useState(false);
  return <span className={`coin-icon ${size === "large" ? "coin-icon-large" : ""}`}>
    {market.icon && !broken ? <img src={market.icon} alt="" loading="lazy" onError={() => setBroken(true)} /> : <span>{market.symbol.slice(0, 2).toUpperCase()}</span>}
  </span>;
}

const sortChoices = [
  { id: "volume", label: "Top volume", icon: BarChart3 },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "new", label: "New launches", icon: Clock3 },
] as const;
type Sort = typeof sortChoices[number]["id"];

export function MarketView({ initialMarkets, stats, full = false, initialSort = "volume" }: { initialMarkets: Market[]; stats?: NetworkStats | null; full?: boolean; initialSort?: Sort }) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [search, setSearch] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const { saved, toggle } = useWatchlist();

  const load = useCallback(async (nextSort: Sort) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/markets?sort=${nextSort}&limit=${full ? 100 : 30}`, { cache: "no-store" });
      const data = await response.json();
      if (Array.isArray(data.markets)) setMarkets(data.markets);
    } catch { /* Keep the most recent available feed. */ }
    finally { setLoading(false); }
  }, [full]);

  useEffect(() => {
    if (sort !== initialSort) load(sort);
  }, [sort, initialSort, load]);

  const filtered = useMemo(() => {
    let items = markets;
    if (savedOnly) items = items.filter((market) => saved.includes(market.token));
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      items = items.filter((market) => `${market.name} ${market.symbol} ${market.token}`.toLowerCase().includes(query));
    }
    return full ? items : items.slice(0, 6);
  }, [markets, savedOnly, saved, search, full]);

  return <div className={`market-view ${full ? "market-view-full" : ""}`}>
    {full && <div className="market-highlights">
      <div className="highlight-card"><span className="highlight-label"><span className="live-dot" /> LIVE ON NEAR</span><b>{stats ? compactNumber(stats.launches) : "—"}</b><small>Tokens launched</small><span className="highlight-art highlight-art-one" /></div>
      <div className="highlight-card"><span className="highlight-label">ALL-TIME VOLUME</span><b>{stats ? usd(stats.volumeUsd, true) : "—"}</b><small>Across the ecosystem</small><span className="highlight-art highlight-art-two" /></div>
      <div className="highlight-card"><span className="highlight-label">ONCHAIN ACTIVITY</span><b>{stats ? compactNumber(stats.trades) : "—"}</b><small>Trades and counting</small><span className="highlight-art highlight-art-three" /></div>
    </div>}
    <div className="market-toolbar">
      <div className="market-tabs" role="tablist" aria-label="Sort markets">
        {sortChoices.map((choice) => <button key={choice.id} type="button" role="tab" aria-selected={sort === choice.id} className={sort === choice.id ? "selected" : ""} onClick={() => setSort(choice.id)}><choice.icon size={15} />{choice.label}</button>)}
      </div>
      <div className="market-tools">
        <label className="market-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tokens..." aria-label="Search tokens" /></label>
        {full && <button className={`favorite-filter ${savedOnly ? "is-active" : ""}`} type="button" onClick={() => setSavedOnly(!savedOnly)} title="Show watchlist"><Star size={17} fill={savedOnly ? "currentColor" : "none"} /></button>}
        <button className={`refresh-button ${loading ? "spinning" : ""}`} type="button" onClick={() => load(sort)} title="Refresh live markets"><RotateCw size={16} /></button>
      </div>
    </div>
    <div className="market-table-wrap">
      <table className="market-table"><thead><tr><th className="market-rank">#</th><th>Token</th><th>Price</th><th>24h change</th><th>Market cap</th><th>24h volume</th><th className="market-holders">Holders</th><th aria-label="Actions" /></tr></thead>
        <tbody>{filtered.map((market, index) => <tr key={market.token}>
          <td className="market-rank">{String(index + 1).padStart(2, "0")}</td>
          <td><Link className="market-token-cell" href={`/trade/${market.token}`}><MarketIcon market={market} /><span className="market-name-wrap"><strong>{market.name}</strong><small>${market.symbol} <span className="market-pair"><img src="/logos/near.png" alt="NEAR pair" width={13} height={13} />NEAR</span></small></span></Link></td>
          <td className="market-number">{usd(market.priceUsd)}</td>
          <td><span className={`market-change ${market.change24h >= 0 ? "positive" : "negative"}`}>{market.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} className="down-arrow" />}{percent(market.change24h)}</span></td>
          <td className="market-number">{usd(market.marketCapUsd, true)}</td>
          <td className="market-number">{usd(market.volume24hUsd, true)}</td>
          <td className="market-number market-holders">{compactNumber(market.holders, 0)}</td>
          <td><div className="market-row-actions"><button type="button" className={`market-heart ${saved.includes(market.token) ? "is-saved" : ""}`} aria-label={saved.includes(market.token) ? "Remove from watchlist" : "Add to watchlist"} onClick={() => toggle(market.token)}><Heart size={17} fill={saved.includes(market.token) ? "currentColor" : "none"} /></button><Link href={`/trade/${market.token}`} className="market-trade-link">Trade <ArrowUpRight size={15} /></Link></div></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="market-empty"><Search size={27} /><strong>{savedOnly ? "Your watchlist is empty" : markets.length ? "No tokens found" : "Markets are loading"}</strong><p>{savedOnly ? "Tap the heart on any token to save it here." : markets.length ? "Try searching for a different token." : "Live market data is temporarily unavailable. Try refreshing."}</p><button type="button" onClick={() => { setSavedOnly(false); setSearch(""); load(sort); }}>Browse all markets <ArrowRight size={15} /></button></div>}
    </div>
    {!full && <div className="market-view-bottom"><span><span className="live-dot" /> Data from Nearly · NEAR mainnet</span><Link href="/markets">Explore all markets <ArrowRight size={17} /></Link></div>}
    {full && <div className="market-table-caption"><span><span className="live-dot" /> Live data from nearly.trade. Prices and volume may change.</span><span>Showing {filtered.length} NEAR pairs</span></div>}
  </div>;
}

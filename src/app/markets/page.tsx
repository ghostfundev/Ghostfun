import Link from "next/link";
import { ArrowUpRight, Radio, Sparkles } from "lucide-react";
import { MarketView } from "@/components/market-view";
import { getMarkets, getStats } from "@/lib/near";

export const dynamic = "force-dynamic";

type Sort = "volume" | "trending" | "new";

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const params = await searchParams;
  const sort: Sort = params.sort === "trending" || params.sort === "new" ? params.sort : "volume";
  const [markets, stats] = await Promise.all([getMarkets(sort, 100), getStats()]);

  return <main className="inner-page markets-page">
    <div className="inner-page-aura" />
    <div className="content-width markets-page-content">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><strong>Explore</strong></div>
      <div className="markets-page-heading"><div><span className="eyebrow"><span className="tiny-line" /> EXPLORE THE ECOSYSTEM</span><h1>Markets that move<br /><span>with you.</span></h1><p>Discover what&apos;s happening now. Every token is live on NEAR, every price comes from the market.</p></div><div className="markets-page-aside"><span className="live-market-pill"><Radio size={15} /> LIVE MARKET DATA</span><Link href="/launch" className="button button-light">Launch your token <ArrowUpRight size={16} /></Link></div></div>
      <div className="markets-divider"><span><Sparkles size={15} /> FIND YOUR NEXT OPPORTUNITY</span><span>Powered by Rhea liquidity</span></div>
      <MarketView initialMarkets={markets} stats={stats} full initialSort={sort} />
      <div className="markets-disclaimer">Trading digital assets involves risk. Always do your own research and review the transaction details in your wallet before signing.</div>
    </div>
  </main>;
}

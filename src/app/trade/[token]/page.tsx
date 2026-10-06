import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TradeTerminal } from "@/components/trade-terminal";
import { getMarket } from "@/lib/near";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const market = await getMarket(token);
  return { title: market ? `Trade ${market.symbol} on NEAR | GHOSTFUN` : "Token not found | GHOSTFUN", description: market ? `Buy and sell ${market.name} on NEAR via Rhea. Onchain quotes, transparent fees, and self-custody.` : "Explore live NEAR token markets." };
}

export default async function TradePage({ params }: Props) {
  const { token } = await params;
  const market = await getMarket(token);
  if (!market) notFound();
  return <TradeTerminal market={market} />;
}

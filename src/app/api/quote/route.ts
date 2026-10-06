import { fromUnits, toUnits } from "@/lib/format";
import { DCL, getMarket, getTax, getTokenDecimals, isValidToken, nearView, WNEAR } from "@/lib/near";
import type { TradeQuote } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const token = params.get("token") || "";
    const side = params.get("side");
    const amount = params.get("amount") || "";
    const slippage = Number(params.get("slippage") || "1");
    if (!isValidToken(token) || (side !== "buy" && side !== "sell")) {
      return Response.json({ error: "Token atau arah trading tidak valid." }, { status: 400 });
    }
    if (!Number.isFinite(slippage) || slippage < 0.1 || slippage > 10) {
      return Response.json({ error: "Slippage harus antara 0.1% dan 10%." }, { status: 400 });
    }
    const market = await getMarket(token);
    if (!market || market.quote !== WNEAR || !market.poolId) {
      return Response.json({ error: "Pool NEAR ini tidak tersedia." }, { status: 404 });
    }
    const [tokenDecimals, tax] = await Promise.all([getTokenDecimals(token), getTax(market.id)]);
    const amountInRaw = toUnits(amount, side === "buy" ? 24 : tokenDecimals);
    const raw = BigInt(amountInRaw);
    if (raw > 10n ** 36n) return Response.json({ error: "Jumlah terlalu besar." }, { status: 400 });
    const buyTaxBps = Number(tax?.buy_bps) || 0;
    const sellTaxBps = Number(tax?.sell_bps) || 0;
    const quoteInput = side === "sell" ? raw * BigInt(10000 - sellTaxBps) / 10000n : raw;
    if (quoteInput <= 0n) throw new Error("Jumlah setelah pajak terlalu kecil.");
    const outputToken = side === "buy" ? token : WNEAR;
    const outputDecimals = side === "buy" ? tokenDecimals : 24;
    const result = await nearView<{ amount: string }>(DCL, "quote", {
      pool_ids: [market.poolId],
      input_token: side === "buy" ? WNEAR : token,
      output_token: outputToken,
      input_amount: quoteInput.toString(),
      tag: "Auto",
    });
    const gross = BigInt(result.amount || "0");
    if (gross <= 0n) throw new Error("Pool tidak dapat memberikan quote untuk jumlah ini.");
    const slippageBps = Math.round(slippage * 100);
    const minimumGross = gross * BigInt(10000 - slippageBps) / 10000n;
    const net = side === "buy" ? gross * BigInt(10000 - buyTaxBps) / 10000n : gross;
    const minimumNet = side === "buy" ? minimumGross * BigInt(10000 - buyTaxBps) / 10000n : minimumGross;
    const notional = side === "buy" ? Number(amount) / market.priceNear : Number(amount) * market.priceNear;
    const fairAfterFees = notional * 0.99 * (side === "buy" ? (1 - buyTaxBps / 10000) : (1 - sellTaxBps / 10000));
    const actual = Number(fromUnits(net, outputDecimals, Math.min(outputDecimals, 12)));
    const priceImpact = fairAfterFees > 0 && Number.isFinite(fairAfterFees) ? Math.max(0, Math.min(99, (1 - actual / fairAfterFees) * 100)) : null;
    const quote: TradeQuote = {
      token, side, poolId: market.poolId,
      amountInRaw, quoteInputRaw: quoteInput.toString(),
      outputRaw: gross.toString(), minOutputRaw: minimumGross.toString(),
      output: fromUnits(net, outputDecimals, side === "buy" ? 4 : 6),
      minimum: fromUnits(minimumNet, outputDecimals, side === "buy" ? 4 : 6),
      inputSymbol: side === "buy" ? "NEAR" : market.symbol,
      outputSymbol: side === "buy" ? market.symbol : "wNEAR",
      tokenDecimals, buyTaxBps, sellTaxBps, slippageBps, priceImpact,
    };
    return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Quote Rhea tidak tersedia." }, { status: 422 });
  }
}

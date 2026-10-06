import { getMarkets, getStats } from "@/lib/near";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const selected = params.get("sort");
  const sort = selected === "trending" || selected === "new" ? selected : "volume";
  const limit = Math.max(10, Math.min(100, Number(params.get("limit")) || 50));
  const [markets, stats] = await Promise.all([getMarkets(sort, limit), getStats()]);
  return Response.json({ markets, stats, source: "nearly.trade", updatedAt: Date.now() });
}

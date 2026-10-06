import { fromUnits, toUnits } from "@/lib/format";
import { FACTORY, getLaunchCost, nearView } from "@/lib/near";

export const dynamic = "force-dynamic";

const FALLBACK_ICON_LIMIT = 16384;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const iconBytes = Number(body.iconBytes || 0);
    if (!Number.isInteger(iconBytes) || iconBytes < 0) {
      return Response.json({ error: "Ukuran gambar tidak valid." }, { status: 400 });
    }
    let maxIconBytes = FALLBACK_ICON_LIMIT;
    try {
      const config = await nearView<{ max_icon_bytes: number }>(FACTORY, "get_config");
      if (Number.isInteger(Number(config.max_icon_bytes)) && Number(config.max_icon_bytes) > 0) maxIconBytes = Number(config.max_icon_bytes);
    } catch { /* The contract limit is used as the fallback. */ }
    if (iconBytes > maxIconBytes) {
      return Response.json({ error: `Logo melebihi batas onchain ${maxIconBytes} karakter.`, maxIconBytes }, { status: 400 });
    }
    const firstBuy = String(body.firstBuy || "0");
    const devBuyYocto = firstBuy === "0" || firstBuy === "" ? null : toUnits(firstBuy, 24);
    if (devBuyYocto && BigInt(devBuyYocto) > 1000n * 10n ** 24n) {
      return Response.json({ error: "First buy terlalu besar." }, { status: 400 });
    }
    const quote = await getLaunchCost(iconBytes, devBuyYocto, Boolean(body.taxed));
    return Response.json({ ...quote, maxIconBytes, display: {
      launchFee: fromUnits(quote.launch_fee, 24, 5),
      tokenStorage: fromUnits(quote.token_storage, 24, 5),
      poolCreate: fromUnits(quote.pool_create, 24, 5),
      dclStorage: fromUnits(quote.dcl_storage, 24, 5),
      devBuy: fromUnits(quote.dev_buy, 24, 5),
      total: fromUnits(quote.total, 24, 5),
    } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal mengambil biaya dari NEAR." }, { status: 400 });
  }
}

import { fromUnits } from "@/lib/format";
import { getNearAvailable, getTokenDecimals, isValidToken, nearView, WNEAR } from "@/lib/near";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const account = params.get("account") || "";
    const token = params.get("token") || "";
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(account) || !isValidToken(token)) {
      return Response.json({ error: "Akun atau token tidak valid." }, { status: 400 });
    }
    type Storage = { total: string; available: string } | null;
    type Bounds = { min: string; max?: string };
    const [availableRaw, tokenRaw, wrappedRaw, tokenStorage, wrappedStorage, tokenBounds, wrappedBounds, decimals] = await Promise.all([
      getNearAvailable(account),
      nearView<string>(token, "ft_balance_of", { account_id: account }).catch(() => "0"),
      nearView<string>(WNEAR, "ft_balance_of", { account_id: account }).catch(() => "0"),
      nearView<Storage>(token, "storage_balance_of", { account_id: account }).catch(() => null),
      nearView<Storage>(WNEAR, "storage_balance_of", { account_id: account }).catch(() => null),
      nearView<Bounds>(token, "storage_balance_bounds").catch(() => ({ min: "1250000000000000000000" })),
      nearView<Bounds>(WNEAR, "storage_balance_bounds").catch(() => ({ min: "1250000000000000000000" })),
      getTokenDecimals(token),
    ]);
    return Response.json({
      availableNear: fromUnits(availableRaw, 24, 5), availableNearRaw: availableRaw,
      tokenBalance: fromUnits(tokenRaw, decimals, 5), tokenBalanceRaw: tokenRaw,
      wrappedNear: fromUnits(wrappedRaw, 24, 5), wrappedNearRaw: wrappedRaw,
      tokenRegistered: Boolean(tokenStorage), wrappedRegistered: Boolean(wrappedStorage),
      tokenStorageMin: tokenBounds.min, wrappedStorageMin: wrappedBounds.min,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Gagal membaca saldo wallet." }, { status: 503 });
  }
}

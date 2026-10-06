export const YOCTO = 10n ** 24n;

export function toUnits(value: string, decimals: number): string {
  const input = value.trim();
  if (!/^(?:\d+)(?:\.\d+)?$/.test(input)) throw new Error("Masukkan jumlah yang valid.");
  const [whole, fraction = ""] = input.split(".");
  if (fraction.length > decimals) throw new Error(`Maksimal ${decimals} angka desimal.`);
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (amount <= 0n) throw new Error("Jumlah harus lebih dari nol.");
  return amount.toString();
}

export function fromUnits(value: string | bigint, decimals: number, precision = 5): string {
  const raw = BigInt(value);
  const negative = raw < 0n;
  const positive = negative ? -raw : raw;
  const scale = 10n ** BigInt(decimals);
  const whole = (positive / scale).toString();
  const fraction = (positive % scale).toString().padStart(decimals, "0").slice(0, precision).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

export function compactNumber(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits }).format(value);
}

export function usd(value: number, compact = false): string {
  if (!Number.isFinite(value)) return "—";
  if (compact) return `$${compactNumber(value)}`;
  if (value > 0 && value < 0.0001) return `$${value.toFixed(8).replace(/0+$/, "")}`;
  if (value < 0.01 && value > 0) return `$${value.toFixed(6).replace(/0+$/, "")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
}

export function percent(value: number): string {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

export function ago(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function shortAddress(value: string): string {
  if (value.length <= 24) return value;
  return `${value.slice(0, 9)}...${value.slice(-8)}`;
}

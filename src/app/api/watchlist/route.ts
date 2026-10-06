import { db } from "@/db";
import { watchlistItems } from "@/db/schema";
import { isValidToken } from "@/lib/near";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function validVisitor(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(value);
}

export async function GET(request: Request) {
  const visitorId = new URL(request.url).searchParams.get("visitorId");
  if (!validVisitor(visitorId)) return Response.json({ error: "ID pengunjung tidak valid." }, { status: 400 });
  try {
    const items = await db.select({ token: watchlistItems.token }).from(watchlistItems).where(eq(watchlistItems.visitorId, visitorId));
    return Response.json({ tokens: items.map((item) => item.token) });
  } catch {
    return Response.json({ error: "Watchlist tidak tersedia." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!validVisitor(body.visitorId) || typeof body.token !== "string" || !isValidToken(body.token)) {
      return Response.json({ error: "Data watchlist tidak valid." }, { status: 400 });
    }
    const match = and(eq(watchlistItems.visitorId, body.visitorId), eq(watchlistItems.token, body.token));
    const exists = await db.select({ id: watchlistItems.id }).from(watchlistItems).where(match).limit(1);
    if (exists.length) {
      await db.delete(watchlistItems).where(match);
      return Response.json({ active: false });
    }
    await db.insert(watchlistItems).values({ visitorId: body.visitorId, token: body.token }).onConflictDoNothing();
    return Response.json({ active: true });
  } catch {
    return Response.json({ error: "Tidak dapat memperbarui watchlist." }, { status: 503 });
  }
}

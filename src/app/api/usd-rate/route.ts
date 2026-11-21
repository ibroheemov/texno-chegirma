import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsdRate } from "@/lib/usdRate";

// Live USD rate (Telegram channel if configured, else CBU, else the store's
// manual rate as a last resort).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const info = await getUsdRate(session.storeId);
  return NextResponse.json({ rate: info });
}

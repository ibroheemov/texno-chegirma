import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUsdRate } from "@/lib/usdRate";

// Live CBU USD rate (or the store's manual rate if CBU is unreachable).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  const info = await getUsdRate(store?.usdRate);
  return NextResponse.json({ rate: info });
}

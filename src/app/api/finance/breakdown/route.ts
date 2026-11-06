import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart, SUPPLIER_PAYMENT_CATEGORY, SALE_CANCEL_CATEGORY } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") === "OUT" ? "OUT" : "IN";
  const period = searchParams.get("period") ?? "month";
  const start = moliyaPeriodStart(period);

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      storeId: session.storeId,
      direction,
      ...(start ? { createdAt: { gte: start } } : {}),
      ...(direction === "OUT"
        ? {
            OR: [
              { category: null },
              { AND: [{ category: { not: SUPPLIER_PAYMENT_CATEGORY } }, { category: { not: SALE_CANCEL_CATEGORY } }] },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { sale: { include: { customer: true } } },
  });

  const saleEntries = entries.filter((e) => e.saleId && !e.sale?.canceled);
  const manualEntries = entries.filter((e) => !e.saleId);

  const salesTotal = saleEntries.reduce((s, e) => s + e.amount, 0);
  const manualTotal = manualEntries.reduce((s, e) => s + e.amount, 0);
  const total = salesTotal + manualTotal;

  const byCategoryMap = new Map<string, { amount: number; count: number }>();
  for (const e of manualEntries) {
    const key = e.category || "Boshqa";
    const cur = byCategoryMap.get(key) ?? { amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    byCategoryMap.set(key, cur);
  }
  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    total,
    salesTotal,
    salesCount: saleEntries.length,
    manualTotal,
    manualCount: manualEntries.length,
    byCategory,
    entries: manualEntries,
  });
}

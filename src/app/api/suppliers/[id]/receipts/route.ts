import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart } from "@/lib/stats";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/receipts">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const start = moliyaPeriodStart(period);

  const receipts = await prisma.goodsReceipt.findMany({
    where: {
      storeId: session.storeId,
      supplierId: id,
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  type ProductRow = {
    productName: string;
    qty: number;
    totalCost: number;
    usdAmount: number;
    receiptsCount: number;
    cash: number;
    card: number;
    credit: number;
    lastPurchasedAt: Date;
  };

  const byProduct = new Map<string, ProductRow>();
  for (const r of receipts) {
    const key = r.productId ?? r.productName;
    const existing = byProduct.get(key) ?? {
      productName: r.productName,
      qty: 0,
      totalCost: 0,
      usdAmount: 0,
      receiptsCount: 0,
      cash: 0,
      card: 0,
      credit: 0,
      lastPurchasedAt: r.createdAt,
    };
    existing.qty += r.qty;
    existing.totalCost += r.totalCost;
    if (r.currency === "usd") existing.usdAmount += r.costUsd ?? 0;
    existing.receiptsCount += 1;
    if (r.paymentMethod === "CASH") existing.cash += r.totalCost;
    else if (r.paymentMethod === "CARD") existing.card += r.totalCost;
    else if (r.paymentMethod === "CREDIT") existing.credit += r.totalCost;
    if (r.createdAt > existing.lastPurchasedAt) existing.lastPurchasedAt = r.createdAt;
    byProduct.set(key, existing);
  }
  const items = Array.from(byProduct.values()).sort((a, b) => b.totalCost - a.totalCost);

  const totals = {
    totalUnits: receipts.reduce((sum, r) => sum + r.qty, 0),
    totalCost: receipts.reduce((sum, r) => sum + r.totalCost, 0),
    totalUsd: receipts.reduce((sum, r) => sum + (r.currency === "usd" ? (r.costUsd ?? 0) : 0), 0),
    receiptsCount: receipts.length,
    distinctProducts: byProduct.size,
    cash: receipts.filter((r) => r.paymentMethod === "CASH").reduce((s, r) => s + r.totalCost, 0),
    card: receipts.filter((r) => r.paymentMethod === "CARD").reduce((s, r) => s + r.totalCost, 0),
    credit: receipts.filter((r) => r.paymentMethod === "CREDIT").reduce((s, r) => s + r.totalCost, 0),
  };

  return NextResponse.json({ items, totals });
}

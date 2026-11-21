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

  type ProductEntry = {
    productName: string;
    qty: number;
    totalCost: number;
    usdAmount: number;
    cash: number;
    card: number;
    credit: number;
    debt: number;
    debtUsd: number;
  };
  type DateGroupBuilder = {
    date: Date;
    products: Map<string, ProductEntry>;
    totalCost: number;
    debt: number;
    debtUsd: number;
    receiptIds: string[];
  };

  // Purchases made the same calendar day are grouped under one date with one
  // "To'lash" button for that day's debt, but each product keeps its own row.
  function dateKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  const byDate = new Map<string, DateGroupBuilder>();
  for (const r of receipts) {
    const key = dateKey(r.createdAt);
    const group: DateGroupBuilder = byDate.get(key) ?? {
      date: r.createdAt,
      products: new Map<string, ProductEntry>(),
      totalCost: 0,
      debt: 0,
      debtUsd: 0,
      receiptIds: [],
    };

    const productKey = r.productId ?? r.productName;
    const product = group.products.get(productKey) ?? {
      productName: r.productName,
      qty: 0,
      totalCost: 0,
      usdAmount: 0,
      cash: 0,
      card: 0,
      credit: 0,
      debt: 0,
      debtUsd: 0,
    };
    product.qty += r.qty;
    product.totalCost += r.totalCost;
    if (r.currency === "usd") product.usdAmount += r.costUsd ?? 0;
    if (r.paymentMethod === "CASH") product.cash += r.totalCost;
    else if (r.paymentMethod === "CARD") product.card += r.totalCost;
    else if (r.paymentMethod === "CREDIT") {
      product.credit += r.totalCost;
      // All CREDIT receipts (paid or not) are tracked here so payment history
      // can still be looked up for a fully-settled group, not just owing ones.
      group.receiptIds.push(r.id);
      // Outstanding (unpaid) part of this credit purchase.
      const dueSom = r.totalCost - r.paidAmount;
      const dueUsd = r.currency === "usd" ? (r.costUsd ?? 0) - r.paidUsd : 0;
      if (dueSom > 0 || dueUsd > 0) {
        product.debt += Math.max(0, dueSom);
        product.debtUsd += Math.max(0, dueUsd);
        group.debt += Math.max(0, dueSom);
        group.debtUsd += Math.max(0, dueUsd);
      }
    }
    group.products.set(productKey, product);
    group.totalCost += r.totalCost;
    byDate.set(key, group);
  }
  const groups = Array.from(byDate.values())
    .map((g) => ({
      date: g.date,
      products: Array.from(g.products.values()).sort((a, b) => b.totalCost - a.totalCost),
      totalCost: g.totalCost,
      debt: g.debt,
      debtUsd: g.debtUsd,
      receiptIds: g.receiptIds,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const totals = {
    totalUnits: receipts.reduce((sum, r) => sum + r.qty, 0),
    totalCost: receipts.reduce((sum, r) => sum + r.totalCost, 0),
    totalUsd: receipts.reduce((sum, r) => sum + (r.currency === "usd" ? (r.costUsd ?? 0) : 0), 0),
    receiptsCount: receipts.length,
    distinctProducts: new Set(receipts.map((r) => r.productId ?? r.productName)).size,
    cash: receipts.filter((r) => r.paymentMethod === "CASH").reduce((s, r) => s + r.totalCost, 0),
    card: receipts.filter((r) => r.paymentMethod === "CARD").reduce((s, r) => s + r.totalCost, 0),
    credit: receipts.filter((r) => r.paymentMethod === "CREDIT").reduce((s, r) => s + r.totalCost, 0),
  };

  return NextResponse.json({ groups, totals });
}

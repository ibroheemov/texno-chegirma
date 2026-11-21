import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getUsdRate } from "@/lib/usdRate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const suppliers = await prisma.supplier.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { receipts: true },
  });

  // Debt is shown in dollars: dollar purchases natively, so'm purchases converted
  // at the live rate (the store's manual rate if no live source is reachable).
  const rateInfo = await getUsdRate(session.storeId);

  // Current warehouse value of stock ever received from each supplier (stock *
  // costPrice, same basis as Ombor's "Jami tan narx"). A product restocked from
  // more than one supplier would have its whole current stock counted under each
  // — harmless today since no product here has more than one source.
  const productIds = [
    ...new Set(suppliers.flatMap((s) => s.receipts.map((r) => r.productId).filter((id): id is string => !!id))),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stock: true, costPrice: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const rows = suppliers.map((s) => {
    const distinctProducts = new Set(s.receipts.map((r) => r.productId ?? r.productName)).size;
    const totalUnits = s.receipts.reduce((sum, r) => sum + r.qty, 0);
    const totalAmount = s.receipts.reduce((sum, r) => sum + r.totalCost, 0);
    const totalUsd = s.receipts.reduce((sum, r) => sum + (r.currency === "usd" ? (r.costUsd ?? 0) : 0), 0);
    const paid = s.receipts.reduce(
      (sum, r) => sum + (r.paymentMethod === "CREDIT" ? r.paidAmount : r.totalCost),
      0
    );
    const debt = totalAmount - paid;
    let debtUsd = 0;
    let debtUsdEstimated = false;
    for (const r of s.receipts) {
      if (r.paymentMethod !== "CREDIT") continue;
      if (r.currency === "usd") {
        debtUsd += Math.max(0, (r.costUsd ?? 0) - r.paidUsd);
      } else {
        const dueSom = Math.max(0, r.totalCost - r.paidAmount);
        if (dueSom > 0 && rateInfo) {
          debtUsd += dueSom / rateInfo.rate;
          debtUsdEstimated = true;
        }
      }
    }
    debtUsd = Math.round(debtUsd * 100) / 100;
    const cash = s.receipts.filter((r) => r.paymentMethod === "CASH").reduce((sum, r) => sum + r.totalCost, 0);
    const card = s.receipts.filter((r) => r.paymentMethod === "CARD").reduce((sum, r) => sum + r.totalCost, 0);
    const supplierProductIds = new Set(s.receipts.map((r) => r.productId).filter((id): id is string => !!id));
    const stockValue = [...supplierProductIds].reduce((sum, id) => {
      const p = productMap.get(id);
      return sum + (p ? p.stock * p.costPrice : 0);
    }, 0);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      distinctProducts,
      totalUnits,
      totalAmount,
      totalUsd,
      cash,
      card,
      debt,
      debtUsd,
      debtUsdEstimated,
      receiptsCount: s.receipts.length,
      stockValue,
    };
  });

  return NextResponse.json({ suppliers: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nomini kiriting" }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: { storeId: session.storeId, name: body.name, phone: body.phone || null },
  });

  return NextResponse.json({ supplier }, { status: 201 });
}

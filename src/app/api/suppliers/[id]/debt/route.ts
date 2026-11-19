import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/debt">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  // Optional: limit to specific receipts (a single product row's debt).
  const receiptIds = new URL(req.url).searchParams.get("receiptIds")?.split(",").filter(Boolean);
  const unpaid = await prisma.goodsReceipt.findMany({
    where: {
      storeId: session.storeId,
      supplierId: id,
      paymentMethod: "CREDIT",
      ...(receiptIds?.length ? { id: { in: receiptIds } } : {}),
    },
  });

  const somReceipts = unpaid.filter((r) => r.currency !== "usd" && r.totalCost - r.paidAmount > 0);
  const usdReceipts = unpaid.filter((r) => r.currency === "usd" && (r.costUsd ?? 0) - r.paidUsd > 0);

  const debtSom = somReceipts.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0);
  const debtUsd = usdReceipts.reduce((sum, r) => sum + ((r.costUsd ?? 0) - r.paidUsd), 0);
  const debtUsdSomValue = usdReceipts.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0);
  const debtTotal = unpaid.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0);

  return NextResponse.json({
    debtTotal,
    debtSom,
    debtUsd,
    debtUsdSomValue,
  });
}

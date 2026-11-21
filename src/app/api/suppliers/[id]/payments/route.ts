import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/payments">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const receiptIds = new URL(req.url).searchParams.get("receiptIds")?.split(",").filter(Boolean) ?? [];
  if (receiptIds.length === 0) return NextResponse.json({ payments: [] });

  const payments = await prisma.supplierPayment.findMany({
    where: { storeId: session.storeId, supplierId: id, receipts: { some: { receiptId: { in: receiptIds } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      paidUsd: p.paidUsd,
      createdAt: p.createdAt,
    })),
  });
}

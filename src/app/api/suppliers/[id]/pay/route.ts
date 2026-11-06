import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY } from "@/lib/stats";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/pay">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  let amount = Math.max(0, Number(body.amount) || 0);
  if (amount <= 0) return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });

  const unpaidReceipts = await prisma.goodsReceipt.findMany({
    where: { storeId: session.storeId, supplierId: id, paymentMethod: "CREDIT" },
    orderBy: { createdAt: "asc" },
  });

  const payable = unpaidReceipts.filter((r) => r.paidAmount < r.totalCost);
  const totalDebt = payable.reduce((sum, r) => sum + (r.totalCost - r.paidAmount), 0);
  if (amount > totalDebt) amount = totalDebt;
  if (amount <= 0) return NextResponse.json({ error: "Qarz mavjud emas" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    let remaining = amount;
    for (const r of payable) {
      if (remaining <= 0) break;
      const due = r.totalCost - r.paidAmount;
      const pay = Math.min(due, remaining);
      await tx.goodsReceipt.update({ where: { id: r.id }, data: { paidAmount: { increment: pay } } });
      remaining -= pay;
    }

    await tx.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "OUT",
        amount,
        method: "CASH",
        category: SUPPLIER_PAYMENT_CATEGORY,
        note: `Ta'minotchiga to'lov: ${supplier.name}`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

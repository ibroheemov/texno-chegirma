import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SALE_CANCEL_CATEGORY } from "@/lib/stats";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sales/[id]/cancel">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const sale = await prisma.sale.findFirst({
    where: { id, storeId: session.storeId },
    include: { items: true, creditDebt: true },
  });
  if (!sale) return NextResponse.json({ error: "Savdo topilmadi" }, { status: 404 });
  if (sale.canceled) return NextResponse.json({ error: "Bu savdo allaqachon bekor qilingan" }, { status: 409 });
  if (sale.creditDebt && sale.creditDebt.paidAmount > 0) {
    return NextResponse.json(
      { error: "Qisman to'langan nasiya savdosini bekor qilib bo'lmaydi" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { canceled: true, canceledAt: new Date() },
    });

    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
    }

    if (sale.creditDebt) {
      await tx.creditLedger.delete({ where: { id: sale.creditDebt.id } });
    }

    const cashBack = sale.cashAmount + sale.cardAmount;
    if (cashBack > 0) {
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          direction: "OUT",
          amount: cashBack,
          method: sale.cashAmount > 0 && sale.cardAmount > 0 ? "MIXED" : sale.cashAmount > 0 ? "CASH" : "CARD",
          category: SALE_CANCEL_CATEGORY,
          note: `Savdo bekor qilindi: ${sale.id}`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

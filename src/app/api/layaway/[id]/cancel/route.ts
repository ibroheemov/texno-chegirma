import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/layaway/[id]/cancel">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const order = await prisma.layawayOrder.findFirst({
    where: { id, storeId: session.storeId },
    include: { customer: true },
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (order.status === "DELIVERED" || order.status === "CANCELED") {
    return NextResponse.json({ error: "Bu buyurtmani bekor qilib bo'lmaydi" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.layawayOrder.update({
      where: { id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    // Release the reserved stock back to the warehouse.
    if (order.productId) {
      await tx.product.update({ where: { id: order.productId }, data: { stock: { increment: order.qty } } });
    }

    // Refund whatever the customer had already paid in.
    if (order.paidAmount > 0) {
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          direction: "OUT",
          amount: order.paidAmount,
          method: "CASH",
          category: "Xaqdorlik to'lovi",
          note: `Xaqdorlik bekor qilindi, qaytarildi: ${order.customer.name} — ${order.productName}`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

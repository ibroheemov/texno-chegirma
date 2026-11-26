import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/layaway/[id]/deliver">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const order = await prisma.layawayOrder.findFirst({ where: { id, storeId: session.storeId } });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (order.status !== "COMPLETED") {
    return NextResponse.json({ error: "Mahsulot faqat to'liq to'langandan keyin berilishi mumkin" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.layawayOrder.update({ where: { id }, data: { status: "DELIVERED", deliveredAt: new Date() } });

    // Stock was already reserved (decremented) when the order was created, so
    // delivery only needs to recognize the revenue/profit — the cash itself
    // was already recorded incrementally via LayawayPayment -> LedgerEntry, so
    // no new ledger entry or stock change happens here.
    if (order.productId) {
      const product = await tx.product.findUnique({ where: { id: order.productId } });
      if (product) {
        const unitPrice = Math.round(order.totalCost / order.qty);
        await tx.sale.create({
          data: {
            storeId: session.storeId,
            layawayOrderId: order.id,
            customerId: order.customerId,
            total: order.totalCost,
            paymentMethod: "CUSTOM",
            profit: order.totalCost - product.costPrice * order.qty,
            items: {
              create: [
                {
                  productId: product.id,
                  name: order.productName,
                  qty: order.qty,
                  price: unitPrice,
                  costPrice: product.costPrice,
                },
              ],
            },
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

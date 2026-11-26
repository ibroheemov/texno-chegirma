import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LAYAWAY_PAYMENT_CATEGORY } from "@/lib/stats";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/layaway/[id]/pay">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const order = await prisma.layawayOrder.findFirst({
    where: { id, storeId: session.storeId },
    include: { customer: true },
  });
  if (!order) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (order.status !== "ACTIVE") {
    return NextResponse.json({ error: "Bu buyurtma uchun to'lov qabul qilib bo'lmaydi" }, { status: 400 });
  }

  const body = await req.json();
  const amount = Math.round(Number(body.amount) || 0);
  const remaining = order.totalCost - order.paidAmount;
  if (!amount || amount <= 0 || amount > remaining) {
    return NextResponse.json({ error: `To'lov summasi 1 dan ${remaining} gacha bo'lishi kerak` }, { status: 400 });
  }
  const method = body.method === "CARD" ? "CARD" : "CASH";
  const note: string | null = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const newPaid = order.paidAmount + amount;
  await prisma.$transaction([
    prisma.layawayPayment.create({ data: { orderId: id, amount, method, note } }),
    prisma.layawayOrder.update({
      where: { id },
      data: { paidAmount: newPaid, status: newPaid >= order.totalCost ? "COMPLETED" : "ACTIVE" },
    }),
    prisma.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "IN",
        amount,
        method,
        category: LAYAWAY_PAYMENT_CATEGORY,
        note: `Xaqdorlik to'lovi: ${order.customer.name} — ${order.productName}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

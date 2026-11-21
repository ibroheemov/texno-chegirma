import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const orders = await prisma.layawayOrder.findMany({
    where: { storeId: session.storeId },
    include: { customer: true, payments: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const customerId: string | undefined = body.customerId || undefined;
  const productId: string | undefined = body.productId || undefined;
  const productName: string = typeof body.productName === "string" ? body.productName.trim() : "";
  const qty = Math.max(1, Number(body.qty) || 1);
  const totalCost = Math.round(Number(body.totalCost) || 0);
  const totalUsd = Number(body.totalUsd) > 0 ? Number(body.totalUsd) : null;
  const initialPayment = Math.max(0, Math.round(Number(body.initialPayment) || 0));
  const method = body.method === "CARD" ? "CARD" : "CASH";
  const note: string | null = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (!customerId) return NextResponse.json({ error: "Mijozni tanlang" }, { status: 400 });
  if (!productName) return NextResponse.json({ error: "Mahsulot nomini kiriting" }, { status: 400 });
  if (!totalCost || totalCost <= 0) return NextResponse.json({ error: "Narxni kiriting" }, { status: 400 });
  if (initialPayment > totalCost) {
    return NextResponse.json({ error: "Boshlang'ich to'lov narxdan oshmasligi kerak" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({ where: { id: customerId, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Mijoz topilmadi" }, { status: 400 });

  let product = null;
  if (productId) {
    product = await prisma.product.findFirst({ where: { id: productId, storeId: session.storeId } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 400 });
    if (product.stock < qty) {
      return NextResponse.json(
        { error: `Omborda yetarli mahsulot yo'q (${product.stock} dona qoldi)` },
        { status: 400 }
      );
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.layawayOrder.create({
      data: {
        storeId: session.storeId,
        customerId,
        productId: product?.id,
        productName: product?.name ?? productName,
        qty,
        totalCost,
        totalUsd,
        note,
        status: initialPayment >= totalCost ? "COMPLETED" : "ACTIVE",
        paidAmount: 0,
      },
    });

    if (product) {
      await tx.product.update({ where: { id: product.id }, data: { stock: { decrement: qty } } });
    }

    if (initialPayment > 0) {
      await tx.layawayPayment.create({ data: { orderId: created.id, amount: initialPayment, method, note } });
      await tx.layawayOrder.update({ where: { id: created.id }, data: { paidAmount: initialPayment } });
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          direction: "IN",
          amount: initialPayment,
          method,
          category: "Xaqdorlik to'lovi",
          note: `Xaqdorlik to'lovi: ${customer.name} — ${created.productName}`,
        },
      });
    }

    return created;
  });

  return NextResponse.json({ order }, { status: 201 });
}

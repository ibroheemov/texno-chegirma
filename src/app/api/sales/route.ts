import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type CartItem = { productId: string; qty: number };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const items: CartItem[] = body.items ?? [];
  const paymentMethod: "CASH" | "CARD" | "CREDIT" | "MIXED" = body.paymentMethod;
  const customerId: string | undefined = body.customerId || undefined;
  const cashAmount: number = body.cashAmount ?? 0;
  const cardAmount: number = body.cardAmount ?? 0;
  const creditAmount: number = body.creditAmount ?? 0;
  const customAmountsInput: Record<string, number> =
    body.customAmounts && typeof body.customAmounts === "object" ? body.customAmounts : {};
  const customAmounts = Object.fromEntries(
    Object.entries(customAmountsInput).filter(([, v]) => typeof v === "number" && v > 0)
  );
  const customTotal = Object.values(customAmounts).reduce((sum, v) => sum + v, 0);
  const dueDate: string | undefined = body.dueDate;

  if (!items.length) {
    return NextResponse.json({ error: "Savatcha bo'sh" }, { status: 400 });
  }
  if ((paymentMethod === "CREDIT" || creditAmount > 0) && !customerId) {
    return NextResponse.json({ error: "Nasiya uchun mijoz tanlang" }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: session.storeId },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 400 });
    }
    if (product.stock < item.qty) {
      return NextResponse.json(
        { error: `${product.name} uchun yetarli zaxira yo'q (${product.stock} dona qoldi)` },
        { status: 400 }
      );
    }
  }

  let total = 0;
  let profit = 0;
  const saleItemsData = items.map((item) => {
    const product = productMap.get(item.productId)!;
    total += product.price * item.qty;
    profit += (product.price - product.costPrice) * item.qty;
    return {
      productId: product.id,
      name: product.name,
      qty: item.qty,
      price: product.price,
      costPrice: product.costPrice,
    };
  });

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        storeId: session.storeId,
        customerId,
        total,
        profit,
        paymentMethod,
        cashAmount,
        cardAmount,
        creditAmount,
        customAmounts: Object.keys(customAmounts).length ? customAmounts : undefined,
        items: { create: saleItemsData },
      },
    });

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      });
    }

    if (cashAmount > 0 || cardAmount > 0 || customTotal > 0) {
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          saleId: created.id,
          direction: "IN",
          amount: cashAmount + cardAmount + customTotal,
          method: paymentMethod,
        },
      });
    }

    if (creditAmount > 0 && customerId) {
      await tx.creditLedger.create({
        data: {
          storeId: session.storeId,
          saleId: created.id,
          customerId,
          totalAmount: creditAmount,
          paidAmount: 0,
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, saleId: sale.id });
}

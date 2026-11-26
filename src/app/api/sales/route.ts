import { syncUsdPrices } from "@/lib/usdRate";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type CartItem = { productId: string; qty: number; unitPrice?: number };

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const items: CartItem[] = body.items ?? [];
  const paymentMethod: "CASH" | "CARD" | "CREDIT" | "MIXED" | "CUSTOM" = body.paymentMethod;
  const customerId: string | undefined = body.customerId || undefined;
  // Employee accounts always sell as themselves.
  const employeeId: string | undefined =
    session.role === "EMPLOYEE" ? session.employeeId : body.employeeId || undefined;
  const cashAmount: number = body.cashAmount ?? 0;
  const cardAmount: number = body.cardAmount ?? 0;
  const creditAmount: number = body.creditAmount ?? 0;
  const discountAmount: number = body.discountAmount ?? 0;
  const customAmountsInput: Record<string, number> =
    body.customAmounts && typeof body.customAmounts === "object" ? body.customAmounts : {};
  const customAmounts = Object.fromEntries(
    Object.entries(customAmountsInput).filter(([, v]) => typeof v === "number" && v > 0)
  );
  const store = await prisma.store.findUnique({
    where: { id: session.storeId },
    select: { deferredPaymentMethods: true },
  });
  const deferredConfig: Record<string, boolean> =
    store?.deferredPaymentMethods && typeof store.deferredPaymentMethods === "object"
      ? (store.deferredPaymentMethods as Record<string, boolean>)
      : {};
  const deferredEntries = Object.entries(customAmounts).filter(([name]) => name in deferredConfig);
  const instantCustomTotal = Object.entries(customAmounts)
    .filter(([name]) => !(name in deferredConfig))
    .reduce((sum, [, v]) => sum + v, 0);

  const settlementDate: string | undefined = body.settlementDate;
  const settlementNote: string = typeof body.settlementNote === "string" ? body.settlementNote.trim() : "";
  if (deferredEntries.length > 0 && !settlementDate) {
    return NextResponse.json({ error: "Pul kelish sanasini tanlang" }, { status: 400 });
  }

  const dueDate: string | undefined = body.dueDate;
  const needsDelivery: boolean = Boolean(body.needsDelivery);
  const deliveryAddress: string = typeof body.deliveryAddress === "string" ? body.deliveryAddress.trim() : "";
  const deliveryDate: string | undefined = typeof body.deliveryDate === "string" && body.deliveryDate ? body.deliveryDate : undefined;

  if (needsDelivery && !deliveryDate) {
    return NextResponse.json({ error: "Yetkazib berish sanasini tanlang" }, { status: 400 });
  }

  if (!items.length) {
    return NextResponse.json({ error: "Savatcha bo'sh" }, { status: 400 });
  }
  if ((paymentMethod === "CREDIT" || creditAmount > 0) && !customerId) {
    return NextResponse.json({ error: "Nasiya uchun mijoz tanlang" }, { status: 400 });
  }

  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, storeId: session.storeId } });
    if (!employee) return NextResponse.json({ error: "Sotuvchi topilmadi" }, { status: 400 });
  }

  await syncUsdPrices(session.storeId);
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
    if (item.unitPrice !== undefined && (!Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      return NextResponse.json({ error: "Mahsulot narxi noto'g'ri" }, { status: 400 });
    }
  }

  let total = 0;
  let profit = 0;
  const saleItemsData = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const unitPrice =
      item.unitPrice ?? (product.onSale && product.salePrice ? product.salePrice : product.price);
    total += unitPrice * item.qty;
    profit += (unitPrice - product.costPrice) * item.qty;
    return {
      productId: product.id,
      name: product.name,
      qty: item.qty,
      price: unitPrice,
      costPrice: product.costPrice,
    };
  });
  if (!Number.isSafeInteger(discountAmount) || discountAmount < 0 || discountAmount > total) {
    return NextResponse.json({ error: "Chegirma summasi noto'g'ri" }, { status: 400 });
  }
  total -= discountAmount;
  profit -= discountAmount;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        storeId: session.storeId,
        customerId,
        soldById: employeeId,
        total,
        discountAmount,
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

    if (cashAmount > 0 || cardAmount > 0 || instantCustomTotal > 0) {
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          saleId: created.id,
          direction: "IN",
          amount: cashAmount + cardAmount + instantCustomTotal,
          method: paymentMethod,
        },
      });
    }

    for (const [methodName, amount] of deferredEntries) {
      await tx.thirdPartySettlement.create({
        data: {
          storeId: session.storeId,
          saleId: created.id,
          methodName,
          amount,
          expectedDate: new Date(settlementDate!),
          note: settlementNote || null,
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

    if (needsDelivery && customerId) {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (customer) {
        await tx.onlineOrder.create({
          data: {
            storeId: session.storeId,
            saleId: created.id,
            source: "POS",
            customerName: customer.name,
            customerPhone: customer.phone ?? "",
            customerAddress: deliveryAddress || customer.address || null,
            items: saleItemsData.map((i) => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              price: i.price,
            })),
            total,
            paymentMethod,
            status: "PENDING",
            deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          },
        });
      }
    }

    return created;
  });

  return NextResponse.json({ ok: true, saleId: sale.id });
}

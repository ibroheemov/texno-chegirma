import type { Prisma } from "@prisma/client";
import { SALE_CANCEL_CATEGORY } from "./stats";

type OrderRow = {
  id: string;
  storeId: string;
  source: string;
  saleId: string | null;
  customerPhone: string;
  items: Prisma.JsonValue;
  paymentMethod: string;
};

type OrderItem = { productId?: string; qty?: number; price?: number };

// Online orders (mini app / Telegram bot) only become revenue once delivered:
// that is when the Sale, its cash/card ledger entry and the stock deduction are
// recorded, so "Savdo summasi" and the Kassa balance reflect them. Orders made at
// the till with "needs delivery" (source POS) already have their Sale and are never touched here.
// Installment orders (CUSTOM) are skipped: they are not paid in full on delivery.
export async function recordSaleForDeliveredOrder(tx: Prisma.TransactionClient, order: OrderRow) {
  if (order.source === "POS") return;
  if (order.paymentMethod !== "CASH" && order.paymentMethod !== "CARD") return;

  if (order.saleId) {
    const existing = await tx.sale.findUnique({ where: { id: order.saleId }, select: { canceled: true } });
    if (existing && !existing.canceled) return; // already counted
  }

  const rawItems = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];
  const wanted = rawItems.filter((i) => i.productId && (i.qty ?? 0) > 0 && (i.price ?? 0) >= 0);
  if (wanted.length === 0) return;

  const products = await tx.product.findMany({
    where: { storeId: order.storeId, id: { in: wanted.map((i) => i.productId!) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lines = wanted
    .filter((i) => productMap.has(i.productId!))
    .map((i) => {
      const p = productMap.get(i.productId!)!;
      return { productId: p.id, name: p.name, qty: i.qty!, price: i.price!, costPrice: p.costPrice };
    });
  if (lines.length === 0) return;

  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const profit = lines.reduce((s, l) => s + (l.price - l.costPrice) * l.qty, 0);
  const isCard = order.paymentMethod === "CARD";

  // Link the sale to a known customer with the same phone (phones are stored as typed).
  const tail = order.customerPhone.replace(/\D/g, "").slice(-9);
  const customer = tail
    ? (await tx.customer.findMany({ where: { storeId: order.storeId, phone: { not: null } } })).find((c) =>
        (c.phone ?? "").replace(/\D/g, "").endsWith(tail)
      )
    : undefined;

  const sale = await tx.sale.create({
    data: {
      storeId: order.storeId,
      customerId: customer?.id,
      total,
      profit,
      paymentMethod: isCard ? "CARD" : "CASH",
      cashAmount: isCard ? 0 : total,
      cardAmount: isCard ? total : 0,
      items: { create: lines },
    },
  });

  for (const l of lines) {
    const p = productMap.get(l.productId)!;
    await tx.product.update({ where: { id: p.id }, data: { stock: Math.max(0, p.stock - l.qty) } });
  }

  if (total > 0) {
    await tx.ledgerEntry.create({
      data: {
        storeId: order.storeId,
        saleId: sale.id,
        direction: "IN",
        amount: total,
        method: isCard ? "CARD" : "CASH",
      },
    });
  }

  await tx.onlineOrder.update({ where: { id: order.id }, data: { saleId: sale.id } });
}

// A delivered order that is moved out of "Yetkazildi" (canceled, failed, reopened):
// undo the sale it created — mark it canceled, return the stock, refund the ledger.
export async function revertSaleForOrder(tx: Prisma.TransactionClient, order: OrderRow) {
  if (order.source === "POS" || !order.saleId) return;

  const sale = await tx.sale.findUnique({ where: { id: order.saleId }, include: { items: true } });
  if (!sale || sale.canceled) return;

  await tx.sale.update({ where: { id: sale.id }, data: { canceled: true, canceledAt: new Date() } });

  for (const item of sale.items) {
    await tx.product.updateMany({
      where: { id: item.productId },
      data: { stock: { increment: item.qty } },
    });
  }

  const cashBack = sale.cashAmount + sale.cardAmount;
  if (cashBack > 0) {
    await tx.ledgerEntry.create({
      data: {
        storeId: sale.storeId,
        direction: "OUT",
        amount: cashBack,
        method: sale.cardAmount > 0 ? "CARD" : "CASH",
        category: SALE_CANCEL_CATEGORY,
        note: `Buyurtma bekor qilindi: ${sale.id}`,
      },
    });
  }
}

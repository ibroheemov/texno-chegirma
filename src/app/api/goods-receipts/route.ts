import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId") ?? undefined;

  const receipts = await prisma.goodsReceipt.findMany({
    where: { storeId: session.storeId, ...(supplierId ? { supplierId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { supplier: true },
    take: 100,
  });

  return NextResponse.json({ receipts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const supplierId = String(body.supplierId ?? "");
  const productName = String(body.productName ?? "").trim();
  const qty = Math.max(1, Number(body.qty) || 0);
  const totalCost = Math.max(0, Number(body.totalCost) || 0);
  const paymentMethod = ["CASH", "CARD", "CREDIT"].includes(body.paymentMethod) ? body.paymentMethod : "CASH";

  if (!supplierId || !productName || !qty || !totalCost) {
    return NextResponse.json({ error: "Barcha maydonlarni to'ldiring" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findFirst({ where: { id: supplierId, storeId: session.storeId } });
  if (!supplier) return NextResponse.json({ error: "Yetkazib beruvchi topilmadi" }, { status: 404 });

  const productId = body.productId || undefined;
  if (productId) {
    const product = await prisma.product.findFirst({ where: { id: productId, storeId: session.storeId } });
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
  }

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.goodsReceipt.create({
      data: {
        storeId: session.storeId,
        supplierId,
        productId: productId || null,
        productName,
        qty,
        totalCost,
        paymentMethod,
        paidAmount: paymentMethod === "CREDIT" ? 0 : totalCost,
      },
    });

    if (productId) {
      await tx.product.update({ where: { id: productId }, data: { stock: { increment: qty } } });
    }

    if (paymentMethod !== "CREDIT") {
      await tx.ledgerEntry.create({
        data: {
          storeId: session.storeId,
          direction: "OUT",
          amount: totalCost,
          method: paymentMethod,
          category: SUPPLIER_PAYMENT_CATEGORY,
          note: `Tovar kirimi: ${productName} · ${supplier.name}`,
        },
      });
    }

    return created;
  });

  return NextResponse.json({ receipt }, { status: 201 });
}

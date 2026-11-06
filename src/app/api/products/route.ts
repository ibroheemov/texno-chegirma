import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "all";
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const take = Number(searchParams.get("take") ?? 24);

  const where = {
    storeId: session.storeId,
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  let products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    take: status === "all" ? take : undefined,
    include: { category: true },
  });

  if (status === "low") products = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).slice(0, take);
  if (status === "out") products = products.filter((p) => p.stock <= 0).slice(0, take);
  if (status === "available") products = products.filter((p) => p.stock > 0).slice(0, take);

  const total = await prisma.product.count({ where });

  return NextResponse.json({ products, total });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.sku || body.price == null) {
    return NextResponse.json({ error: "Nomi, SKU va narxini kiriting" }, { status: 400 });
  }

  const existing = await prisma.product.findFirst({
    where: { storeId: session.storeId, sku: body.sku },
  });
  if (existing) {
    return NextResponse.json({ error: "Bu SKU allaqachon mavjud" }, { status: 409 });
  }

  const supplierId: string | undefined = body.supplierId || undefined;
  const intakeQty = Number(body.stock ?? 0);
  const costPrice = Number(body.costPrice ?? 0);
  const paymentMethod = ["CASH", "CARD", "CREDIT"].includes(body.paymentMethod) ? body.paymentMethod : "CASH";

  let supplier = null;
  if (supplierId) {
    supplier = await prisma.supplier.findFirst({ where: { id: supplierId, storeId: session.storeId } });
    if (!supplier) return NextResponse.json({ error: "Yetkazib beruvchi topilmadi" }, { status: 404 });
  }

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        storeId: session.storeId,
        name: body.name,
        sku: body.sku,
        price: Number(body.price),
        costPrice,
        stock: supplier ? 0 : intakeQty,
        lowStockAt: Number(body.lowStockAt ?? 3),
        categoryId: body.categoryId || null,
        imageUrl: body.imageUrl || null,
        unit: body.unit || "dona",
        barcodePrice: body.barcodePrice ? Number(body.barcodePrice) : null,
        onSale: Boolean(body.onSale),
        salePrice: body.onSale && body.salePrice ? Number(body.salePrice) : null,
      },
    });

    if (supplier && intakeQty > 0) {
      const totalCost = costPrice * intakeQty;
      await tx.goodsReceipt.create({
        data: {
          storeId: session.storeId,
          supplierId: supplier.id,
          productId: created.id,
          productName: created.name,
          qty: intakeQty,
          totalCost,
          paymentMethod,
          paidAmount: paymentMethod === "CREDIT" ? 0 : totalCost,
        },
      });
      await tx.product.update({ where: { id: created.id }, data: { stock: { increment: intakeQty } } });

      if (paymentMethod !== "CREDIT" && totalCost > 0) {
        await tx.ledgerEntry.create({
          data: {
            storeId: session.storeId,
            direction: "OUT",
            amount: totalCost,
            method: paymentMethod,
            category: SUPPLIER_PAYMENT_CATEGORY,
            note: `Tovar kirimi: ${created.name} · ${supplier.name}`,
          },
        });
      }
    }

    return created;
  });

  return NextResponse.json({ product }, { status: 201 });
}

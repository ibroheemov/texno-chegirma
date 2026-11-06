import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json();
  const product = await prisma.product.findFirst({ where: { id, storeId: session.storeId } });
  if (!product) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      sku: body.sku,
      price: Number(body.price),
      costPrice: Number(body.costPrice ?? 0),
      stock: Number(body.stock ?? 0),
      lowStockAt: Number(body.lowStockAt ?? 3),
      categoryId: body.categoryId || null,
      imageUrl: body.imageUrl || null,
      unit: body.unit || "dona",
      barcodePrice: body.barcodePrice ? Number(body.barcodePrice) : null,
      onSale: Boolean(body.onSale),
      salePrice: body.onSale && body.salePrice ? Number(body.salePrice) : null,
    },
  });

  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const product = await prisma.product.findFirst({ where: { id, storeId: session.storeId } });
  if (!product) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  try {
    await prisma.product.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu mahsulot sotuvlarda ishlatilgan, o'chirib bo'lmaydi" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

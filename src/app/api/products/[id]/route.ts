import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncUsdPrices } from "@/lib/usdRate";
import { installmentMarkupsForStorage } from "@/lib/installment";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json();
  const product = await prisma.product.findFirst({ where: { id, storeId: session.storeId } });
  if (!product) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  // Prices were synced when the list loaded; re-sync so a manual edit is based
  // on the current rate.
  await syncUsdPrices(session.storeId);
  const images: string[] = Array.isArray(body.images) ? body.images.filter((u: unknown) => typeof u === "string") : [];

  // The edit form sends its own currency + rate, same as creating a product —
  // this is what lets switching a product into (or out of) Dollar mode while
  // editing it actually take effect, instead of only working at creation time.
  const currency = body.currency === "usd" ? "usd" : "som";
  const usdRate = currency === "usd" && Number(body.usdRate) > 0 ? Number(body.usdRate) : null;

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
      imageUrl: images[0] ?? null,
      images: images.length ? images : Prisma.JsonNull,
      unit: body.unit || "dona",
      barcodePrice: body.barcodePrice ? Number(body.barcodePrice) : null,
      onSale: Boolean(body.onSale),
      salePrice: body.onSale && body.salePrice ? Number(body.salePrice) : null,
      usdRate,
      installmentMarkups: installmentMarkupsForStorage(body.installmentMarkups) ?? Prisma.JsonNull,
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

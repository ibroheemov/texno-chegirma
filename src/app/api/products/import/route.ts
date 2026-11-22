import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type ImportRow = {
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  barcodePrice: number | null;
  stock: number;
  category: string;
  unit: string;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const storeId = session.storeId;

  const body = await req.json();
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Import qilinadigan qatorlar topilmadi" }, { status: 400 });
  }
  // Which target fields actually had a source column chosen in the mapping
  // step — on update, a field the user never mapped is left untouched rather
  // than being overwritten with a default (0/null).
  const mappedFields: Set<string> = new Set(Array.isArray(body.mappedFields) ? body.mappedFields : []);

  // Cache category name -> id lookups within this batch so the same new
  // category name (e.g. "Aksessuarlar" repeated across many rows) is only
  // created once instead of racing itself.
  const categoryCache = new Map<string, string>();
  async function resolveCategoryId(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const key = trimmed.toLowerCase();
    const cached = categoryCache.get(key);
    if (cached) return cached;
    const existing = await prisma.category.findFirst({
      where: { storeId, name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) {
      categoryCache.set(key, existing.id);
      return existing.id;
    }
    const created = await prisma.category.create({ data: { storeId, name: trimmed } });
    categoryCache.set(key, created.id);
    return created.id;
  }

  let created = 0;
  let updated = 0;
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for the header row, matches the row number in the spreadsheet
    const name = (r.name || "").trim();
    const price = Number(r.price) || 0;
    if (!name || price <= 0) {
      skipped.push({ row: rowNum, reason: !name ? "Nomi yo'q" : "Narxi noto'g'ri" });
      continue;
    }

    const sku = (r.sku || "").trim() || `AUTO-${Date.now()}${i}`;
    const categoryId = r.category ? await resolveCategoryId(r.category) : null;
    const data = {
      name,
      price,
      costPrice: Math.max(0, Math.round(Number(r.costPrice) || 0)),
      barcodePrice: r.barcodePrice && Number(r.barcodePrice) > 0 ? Math.round(Number(r.barcodePrice)) : null,
      stock: Math.max(0, Math.round(Number(r.stock) || 0)),
      unit: (r.unit || "").trim() || "dona",
      categoryId,
    };

    try {
      const existingProduct = await prisma.product.findUnique({
        where: { storeId_sku: { storeId, sku } },
      });
      if (existingProduct) {
        const updateData: Partial<typeof data> = { name, price };
        if (mappedFields.has("costPrice")) updateData.costPrice = data.costPrice;
        if (mappedFields.has("barcodePrice")) updateData.barcodePrice = data.barcodePrice;
        if (mappedFields.has("stock")) updateData.stock = data.stock;
        if (mappedFields.has("unit")) updateData.unit = data.unit;
        if (mappedFields.has("category")) updateData.categoryId = data.categoryId;
        await prisma.product.update({ where: { id: existingProduct.id }, data: updateData });
        updated++;
      } else {
        await prisma.product.create({ data: { ...data, storeId, sku } });
        created++;
      }
    } catch {
      skipped.push({ row: rowNum, reason: "Saqlashda xatolik" });
    }
  }

  return NextResponse.json({ created, updated, skipped });
}

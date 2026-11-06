import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const suppliers = await prisma.supplier.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { receipts: true },
  });

  const rows = suppliers.map((s) => {
    const distinctProducts = new Set(s.receipts.map((r) => r.productId ?? r.productName)).size;
    const totalUnits = s.receipts.reduce((sum, r) => sum + r.qty, 0);
    const totalAmount = s.receipts.reduce((sum, r) => sum + r.totalCost, 0);
    const paid = s.receipts.reduce(
      (sum, r) => sum + (r.paymentMethod === "CREDIT" ? r.paidAmount : r.totalCost),
      0
    );
    const debt = totalAmount - paid;
    const cash = s.receipts.filter((r) => r.paymentMethod === "CASH").reduce((sum, r) => sum + r.totalCost, 0);
    const card = s.receipts.filter((r) => r.paymentMethod === "CARD").reduce((sum, r) => sum + r.totalCost, 0);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      distinctProducts,
      totalUnits,
      totalAmount,
      cash,
      card,
      debt,
      receiptsCount: s.receipts.length,
    };
  });

  return NextResponse.json({ suppliers: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nomini kiriting" }, { status: 400 });

  const supplier = await prisma.supplier.create({
    data: { storeId: session.storeId, name: body.name, phone: body.phone || null },
  });

  return NextResponse.json({ supplier }, { status: 201 });
}

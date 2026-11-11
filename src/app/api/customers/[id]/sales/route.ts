import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/customers/[id]/sales">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const customer = await prisma.customer.findFirst({ where: { id, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const sales = await prisma.sale.findMany({
    where: { storeId: session.storeId, customerId: id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = sales.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    paymentMethod: s.paymentMethod,
    customAmounts: s.customAmounts,
    total: s.total,
    canceled: s.canceled,
    items: s.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
  }));

  const activeSales = sales.filter((s) => !s.canceled);
  const totals = {
    ordersCount: activeSales.length,
    totalSpent: activeSales.reduce((sum, s) => sum + s.total, 0),
  };

  return NextResponse.json({ sales: rows, totals });
}

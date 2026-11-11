import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/credit/customers/[id]/payments">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const customer = await prisma.customer.findFirst({ where: { id, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const ledgers = await prisma.creditLedger.findMany({
    where: { customerId: id, storeId: session.storeId },
    include: {
      sale: { include: { items: true } },
      payments: { include: { employee: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const ledgerRows = ledgers.map((l) => ({
    id: l.id,
    createdAt: l.createdAt,
    dueDate: l.dueDate,
    totalAmount: l.totalAmount,
    paidAmount: l.paidAmount,
    remaining: l.totalAmount - l.paidAmount,
    overdue: l.paidAmount < l.totalAmount && l.dueDate < now,
    items: l.sale?.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) ?? [],
    payments: l.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      note: p.note,
      employeeName: p.employee?.name ?? null,
      createdAt: p.createdAt,
    })),
  }));

  return NextResponse.json({
    customer: { name: customer.name, phone: customer.phone },
    ledgers: ledgerRows,
    totals: {
      totalDebt: ledgerRows.reduce((s, l) => s + l.totalAmount, 0),
      totalPaid: ledgerRows.reduce((s, l) => s + l.paidAmount, 0),
      totalRemaining: ledgerRows.reduce((s, l) => s + l.remaining, 0),
      paymentsCount: ledgerRows.reduce((s, l) => s + l.payments.length, 0),
    },
  });
}

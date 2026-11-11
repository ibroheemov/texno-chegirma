import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY, SALE_CANCEL_CATEGORY } from "@/lib/stats";

function periodStart(period: string) {
  const now = new Date();
  const start = new Date(now);
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 7);
  } else if (period === "month") {
    start.setMonth(start.getMonth() - 1);
  } else {
    return null;
  }
  return start;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const start = periodStart(period);

  const entries = await prisma.ledgerEntry.findMany({
    where: { storeId: session.storeId, ...(start ? { createdAt: { gte: start } } : {}) },
    orderBy: { createdAt: "desc" },
    include: { sale: { include: { customer: true } } },
    take: 200,
  });

  const cashIn = entries.filter((e) => e.method === "CASH" && e.direction === "IN").reduce((s, e) => s + e.amount, 0);
  const cashOut = entries.filter((e) => e.method === "CASH" && e.direction === "OUT").reduce((s, e) => s + e.amount, 0);
  const cardIn = entries.filter((e) => e.method === "CARD" && e.direction === "IN").reduce((s, e) => s + e.amount, 0);
  const cardOut = entries.filter((e) => e.method === "CARD" && e.direction === "OUT").reduce((s, e) => s + e.amount, 0);
  const mixedIn = entries.filter((e) => e.method === "MIXED" && e.direction === "IN").reduce((s, e) => s + e.amount, 0);
  const customIn = entries.filter((e) => e.method === "CUSTOM" && e.direction === "IN").reduce((s, e) => s + e.amount, 0);

  // "Naqd qoldiq" / "Karta qoldiq" are a running all-time balance, not scoped
  // to the selected period, so they're computed separately from `entries`.
  const [cashInAllAgg, cashOutAllAgg, cardInAllAgg, cardOutAllAgg, handedOverAllAgg] = await Promise.all([
    prisma.ledgerEntry.aggregate({
      where: { storeId: session.storeId, method: "CASH", direction: "IN" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { storeId: session.storeId, method: "CASH", direction: "OUT" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { storeId: session.storeId, method: "CARD", direction: "IN" },
      _sum: { amount: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: { storeId: session.storeId, method: "CARD", direction: "OUT" },
      _sum: { amount: true },
    }),
    prisma.cashHandover.aggregate({
      where: { storeId: session.storeId, status: "APPROVED" },
      _sum: { cashAmount: true },
    }),
  ]);
  const cashBalance = (cashInAllAgg._sum.amount ?? 0) - (cashOutAllAgg._sum.amount ?? 0) - (handedOverAllAgg._sum.cashAmount ?? 0);
  const cardBalance = (cardInAllAgg._sum.amount ?? 0) - (cardOutAllAgg._sum.amount ?? 0);

  const creditOutstanding = await prisma.creditLedger.aggregate({
    where: { storeId: session.storeId },
    _sum: { totalAmount: true, paidAmount: true },
  });
  const creditTotal = creditOutstanding._sum.totalAmount ?? 0;
  const creditPaid = creditOutstanding._sum.paidAmount ?? 0;

  const pendingSettlementsAgg = await prisma.thirdPartySettlement.aggregate({
    where: { storeId: session.storeId, received: false },
    _sum: { amount: true },
  });
  const pendingSettlements = pendingSettlementsAgg._sum.amount ?? 0;

  // "Chiqarilgan" is all-time total operating expenses — OUT entries that
  // aren't inventory purchases (already counted via costPrice/profit) or
  // sale-cancellation reversals, matching the Chiqim tab's definition.
  const expensesAgg = await prisma.ledgerEntry.aggregate({
    where: {
      storeId: session.storeId,
      direction: "OUT",
      OR: [
        { category: null },
        { AND: [{ category: { not: SUPPLIER_PAYMENT_CATEGORY } }, { category: { not: SALE_CANCEL_CATEGORY } }] },
      ],
    },
    _sum: { amount: true },
  });
  const expenses = expensesAgg._sum.amount ?? 0;

  const profitAgg = await prisma.sale.aggregate({
    where: {
      storeId: session.storeId,
      canceled: false,
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _sum: { profit: true },
  });
  const profit = profitAgg._sum.profit ?? 0;

  return NextResponse.json({
    entries,
    balances: {
      cash: cashBalance,
      card: cardBalance,
      kassa: cashBalance + cardBalance,
      mixed: mixedIn,
      creditOutstanding: creditTotal - creditPaid,
      pendingSettlements,
      totalIn: cashIn + cardIn + mixedIn + customIn,
      totalOut: cashOut + cardOut,
      expenses,
      profit,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });
  }

  const entry = await prisma.ledgerEntry.create({
    data: {
      storeId: session.storeId,
      direction: body.direction === "OUT" ? "OUT" : "IN",
      amount,
      method: body.method === "CARD" ? "CARD" : "CASH",
      category: body.category || null,
      note: body.note || null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

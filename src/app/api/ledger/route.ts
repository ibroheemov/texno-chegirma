import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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

  const creditOutstanding = await prisma.creditLedger.aggregate({
    where: { storeId: session.storeId },
    _sum: { totalAmount: true, paidAmount: true },
  });
  const creditTotal = creditOutstanding._sum.totalAmount ?? 0;
  const creditPaid = creditOutstanding._sum.paidAmount ?? 0;

  const handedOverAgg = await prisma.cashHandover.aggregate({
    where: {
      storeId: session.storeId,
      status: "APPROVED",
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    _sum: { cashAmount: true },
  });
  const handedOver = handedOverAgg._sum.cashAmount ?? 0;

  return NextResponse.json({
    entries,
    balances: {
      cash: cashIn - cashOut - handedOver,
      card: cardIn - cardOut,
      mixed: mixedIn,
      creditOutstanding: creditTotal - creditPaid,
      totalIn: cashIn + cardIn + mixedIn,
      totalOut: cashOut + cardOut,
      handedOver,
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

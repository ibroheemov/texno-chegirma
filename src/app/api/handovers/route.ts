import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("take") ?? 50);

  const handovers = await prisma.cashHandover.findMany({
    where: { storeId: session.storeId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const stats = {
    total: handovers.length,
    pending: handovers.filter((h) => h.status === "PENDING").length,
    approved: handovers.filter((h) => h.status === "APPROVED").length,
    rejected: handovers.filter((h) => h.status === "REJECTED").length,
  };

  return NextResponse.json({ handovers, stats });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const handedOverBy = String(body.handedOverBy ?? "").trim();
  const receivedBy = String(body.receivedBy ?? "").trim();
  if (!handedOverBy || !receivedBy) {
    return NextResponse.json({ error: "Topshiruvchi va qabul qiluvchini kiriting" }, { status: 400 });
  }

  const cashAmount = Math.max(0, Number(body.cashAmount) || 0);
  const cardAmount = Math.max(0, Number(body.cardAmount) || 0);
  const creditAmount = Math.max(0, Number(body.creditAmount) || 0);
  const totalAmount = cashAmount + cardAmount + creditAmount;

  if (totalAmount <= 0) {
    return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });
  }

  const handover = await prisma.cashHandover.create({
    data: {
      storeId: session.storeId,
      handedOverBy,
      receivedBy,
      note: body.note || null,
      cashAmount,
      cardAmount,
      creditAmount,
      totalAmount,
    },
  });

  return NextResponse.json({ handover }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/ledger/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.ledgerEntry.findFirst({ where: { id, storeId: session.storeId } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (existing.saleId) {
    return NextResponse.json(
      { error: "Savdoga bog'langan yozuvni bu yerda tahrirlab bo'lmaydi" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Summani kiriting" }, { status: 400 });
  }

  const entry = await prisma.ledgerEntry.update({
    where: { id },
    data: {
      direction: body.direction === "OUT" ? "OUT" : "IN",
      amount,
      method: body.method === "CARD" ? "CARD" : "CASH",
      category: body.category || null,
      note: body.note || null,
    },
  });

  return NextResponse.json({ entry });
}

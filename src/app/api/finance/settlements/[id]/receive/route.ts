import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { THIRD_PARTY_SETTLEMENT_CATEGORY } from "@/lib/stats";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/finance/settlements/[id]/receive">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await req.json();
  const method: "CASH" | "CARD" = body.method === "CARD" ? "CARD" : "CASH";

  const settlement = await prisma.thirdPartySettlement.findFirst({ where: { id, storeId: session.storeId } });
  if (!settlement) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (settlement.received) {
    return NextResponse.json({ error: "Bu to'lov allaqachon qabul qilingan" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.thirdPartySettlement.update({
      where: { id },
      data: { received: true, receivedAt: new Date(), receivedMethod: method },
    });

    await tx.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "IN",
        amount: settlement.amount,
        method,
        category: THIRD_PARTY_SETTLEMENT_CATEGORY,
        note: `${settlement.methodName}: uchinchi tomon to'lovi (savdo ${settlement.saleId})`,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

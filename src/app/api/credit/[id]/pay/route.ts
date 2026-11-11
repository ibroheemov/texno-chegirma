import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/credit/[id]/pay">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const ledger = await prisma.creditLedger.findFirst({ where: { id, storeId: session.storeId } });
  if (!ledger) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const amount = Number(body.amount);
  const remaining = ledger.totalAmount - ledger.paidAmount;
  if (!amount || amount <= 0 || amount > remaining) {
    return NextResponse.json({ error: `To'lov summasi 1 dan ${remaining} gacha bo'lishi kerak` }, { status: 400 });
  }

  const employeeId: string | undefined = body.employeeId || undefined;
  const note: string | undefined = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  if (employeeId) {
    const employee = await prisma.employee.findFirst({ where: { id: employeeId, storeId: session.storeId } });
    if (!employee) return NextResponse.json({ error: "Xodim topilmadi" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.creditPayment.create({ data: { ledgerId: id, amount, employeeId, note } }),
    prisma.creditLedger.update({ where: { id }, data: { paidAmount: { increment: amount } } }),
    prisma.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "IN",
        amount,
        method: "CASH",
        note: note ? `Nasiya to'lovi: ${note}` : "Nasiya to'lovi",
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

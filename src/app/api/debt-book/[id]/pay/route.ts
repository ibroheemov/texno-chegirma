import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DEBT_BOOK_LEDGER_CATEGORY, isValidYmd, paymentDateFromYmd } from "@/lib/debtBook";

// Qarz daftari: record a payment against a debt entry. The payment also lands in Moliya's cash ledger
// as an incoming entry (category "Qarz daftari"), in the same transaction.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/debt-book/[id]/pay">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role === "EMPLOYEE") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const { id } = await ctx.params;

  const entry = await prisma.debtEntry.findFirst({ where: { id, storeId: session.storeId } });
  if (!entry) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (entry.canceledAt) return NextResponse.json({ error: "Bekor qilingan yozuvga to'lov qo'shib bo'lmaydi" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const remaining = entry.totalAmount - entry.paidAmount;
  if (remaining <= 0) return NextResponse.json({ error: "Qarz to'liq to'langan" }, { status: 400 });
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) {
    return NextResponse.json({ error: `To'lov summasi 1 dan ${remaining} gacha bo'lishi kerak` }, { status: 400 });
  }

  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const createdAt = isValidYmd(body.date) ? paymentDateFromYmd(body.date) : new Date();

  // The money comes into the till, so Moliya's cash ledger gets an incoming entry too.
  const ledgerNote = `${entry.debtorName} — ${entry.item}${note ? `: ${note}` : ""}`;

  await prisma.$transaction([
    prisma.debtPayment.create({ data: { entryId: id, amount, note, createdAt } }),
    prisma.debtEntry.update({ where: { id }, data: { paidAmount: { increment: amount } } }),
    prisma.ledgerEntry.create({
      data: {
        storeId: session.storeId,
        direction: "IN",
        amount,
        method: "CASH",
        category: DEBT_BOOK_LEDGER_CATEGORY,
        note: ledgerNote,
        createdAt,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

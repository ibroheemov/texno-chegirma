import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dueDateFromYmd, parseDebtBody } from "@/lib/debtBook";
import { formatSom } from "@/lib/format";

// Qarz daftari: edit a debt entry (name, phone, what was taken, total, due date, note).
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/debt-book/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role === "EMPLOYEE") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const { id } = await ctx.params;

  const entry = await prisma.debtEntry.findFirst({ where: { id, storeId: session.storeId } });
  if (!entry) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (entry.canceledAt) return NextResponse.json({ error: "Bekor qilingan yozuvni tahrirlab bo'lmaydi" }, { status: 400 });

  const parsed = parseDebtBody(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { dueDate, ...rest } = parsed.data;

  if (rest.totalAmount < entry.paidAmount) {
    return NextResponse.json(
      { error: `Jami summa to'langan summadan (${formatSom(entry.paidAmount)}) kam bo'lmasligi kerak` },
      { status: 400 }
    );
  }

  await prisma.debtEntry.update({ where: { id }, data: { ...rest, dueDate: dueDateFromYmd(dueDate) } });
  return NextResponse.json({ ok: true });
}

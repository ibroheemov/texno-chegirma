import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Qarz daftari: cancel a debt entry. It moves to "Bekor qilingan" and no longer counts in the totals;
// its payment history is kept.
export async function POST(_req: Request, ctx: RouteContext<"/api/debt-book/[id]/cancel">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role === "EMPLOYEE") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const { id } = await ctx.params;

  const entry = await prisma.debtEntry.findFirst({ where: { id, storeId: session.storeId } });
  if (!entry) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (entry.canceledAt) return NextResponse.json({ ok: true });

  await prisma.debtEntry.update({ where: { id }, data: { canceledAt: new Date() } });
  return NextResponse.json({ ok: true });
}

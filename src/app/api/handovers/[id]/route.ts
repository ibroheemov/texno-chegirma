import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/handovers/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const handover = await prisma.cashHandover.findFirst({ where: { id, storeId: session.storeId } });
  if (!handover) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "Noto'g'ri status" }, { status: 400 });
  }

  const updated = await prisma.cashHandover.update({
    where: { id },
    data: { status: body.status, decidedAt: new Date() },
  });

  return NextResponse.json({ handover: updated });
}

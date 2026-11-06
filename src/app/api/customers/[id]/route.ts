import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({ where: { id, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone || null,
      address: body.address || null,
      note: body.note || null,
    },
  });
  return NextResponse.json({ customer: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({ where: { id, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  try {
    await prisma.customer.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu mijoz sotuvlarda ishlatilgan, o'chirib bo'lmaydi" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

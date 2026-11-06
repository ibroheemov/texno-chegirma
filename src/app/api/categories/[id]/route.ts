import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const category = await prisma.category.findFirst({ where: { id, storeId: session.storeId } });
  if (!category) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.category.update({ where: { id }, data: { name: body.name } });
  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/categories/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const category = await prisma.category.findFirst({ where: { id, storeId: session.storeId } });
  if (!category) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Bu kategoriyada mahsulotlar bor, avval ularni ko'chiring" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

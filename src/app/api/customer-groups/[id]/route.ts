import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { normalizeColor } from "@/lib/customerSegments";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/customer-groups/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const current = await prisma.customerGroup.findFirst({ where: { id, storeId: session.storeId } });
  if (!current) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "Nomini kiriting" }, { status: 400 });

  const duplicate = await prisma.customerGroup.findFirst({ where: { storeId: session.storeId, name, NOT: { id } } });
  if (duplicate) return NextResponse.json({ error: "Bu nomdagi guruh allaqachon mavjud" }, { status: 409 });

  const updated = await prisma.customerGroup.update({
    where: { id },
    data: {
      name,
      color: normalizeColor(body.color),
      description: typeof body.description === "string" && body.description.trim() ? body.description.trim().slice(0, 200) : null,
    },
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/customer-groups/[id]">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const current = await prisma.customerGroup.findFirst({ where: { id, storeId: session.storeId } });
  if (!current) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  // Customers keep existing; they just leave the guruh.
  await prisma.customerGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

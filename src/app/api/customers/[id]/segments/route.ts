import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// New design -> Mijozlar: set a customer's group and tags. Fields that are absent stay unchanged.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/customers/[id]/segments">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({ where: { id, storeId: session.storeId } });
  if (!customer) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { groupId?: string | null; tags?: { set: { id: string }[] } } = {};

  if ("groupId" in body) {
    const groupId = typeof body.groupId === "string" && body.groupId ? body.groupId : null;
    if (groupId) {
      const group = await prisma.customerGroup.findFirst({ where: { id: groupId, storeId: session.storeId } });
      if (!group) return NextResponse.json({ error: "Guruh topilmadi" }, { status: 400 });
    }
    data.groupId = groupId;
  }

  if (Array.isArray(body.tagIds)) {
    const tagIds: string[] = [
      ...new Set<string>((body.tagIds as unknown[]).filter((t): t is string => typeof t === "string")),
    ];
    const tags = await prisma.customerTag.findMany({
      where: { id: { in: tagIds }, storeId: session.storeId },
      select: { id: true },
    });
    if (tags.length !== tagIds.length) return NextResponse.json({ error: "Teg topilmadi" }, { status: 400 });
    data.tags = { set: tags };
  }

  await prisma.customer.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Nomini kiriting" }, { status: 400 });

  const existing = await prisma.category.findFirst({ where: { storeId: session.storeId, name: body.name } });
  if (existing) return NextResponse.json({ error: "Bu kategoriya allaqachon mavjud" }, { status: 409 });

  const category = await prisma.category.create({ data: { storeId: session.storeId, name: body.name } });
  return NextResponse.json({ category }, { status: 201 });
}

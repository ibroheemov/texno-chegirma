import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Ismni kiriting" }, { status: 400 });

  const customer = await prisma.customer.create({
    data: {
      storeId: session.storeId,
      name: body.name,
      phone: body.phone || null,
      address: body.address || null,
      note: body.note || null,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}

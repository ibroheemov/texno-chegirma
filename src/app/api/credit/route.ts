import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const ledgers = await prisma.creditLedger.findMany({
    where: { storeId: session.storeId },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  });

  return NextResponse.json({ ledgers });
}

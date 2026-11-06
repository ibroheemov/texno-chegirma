import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SUPPLIER_PAYMENT_CATEGORY } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") === "OUT" ? "OUT" : "IN";

  const rows = await prisma.ledgerEntry.findMany({
    where: { storeId: session.storeId, direction, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  const categories = rows
    .map((r) => r.category!)
    .filter((c) => c !== SUPPLIER_PAYMENT_CATEGORY)
    .sort();

  return NextResponse.json({ categories });
}

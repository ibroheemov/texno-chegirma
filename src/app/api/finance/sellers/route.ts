import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSellerSummary } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";

  const [summary, adminUser] = await Promise.all([
    getSellerSummary(session.storeId, period),
    prisma.user.findFirst({ where: { storeId: session.storeId } }),
  ]);

  const rows = summary.rows.map((r) =>
    r.id === null ? { ...r, name: adminUser ? `${adminUser.name} (admin)` : "Admin" } : r
  );

  return NextResponse.json({ rows, totals: summary.totals });
}

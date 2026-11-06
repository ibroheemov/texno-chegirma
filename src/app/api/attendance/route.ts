import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "today";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const start = moliyaPeriodStart(period);

  const records = await prisma.attendance.findMany({
    where: {
      employee: { storeId: session.storeId },
      ...(employeeId ? { employeeId } : {}),
      ...(start ? { date: { gte: start } } : {}),
    },
    orderBy: { date: "desc" },
    include: { employee: true },
    take: 200,
  });

  const presentToday = records.filter((r) => {
    const today = new Date();
    return (
      r.status === "PRESENT" &&
      r.date.getFullYear() === today.getFullYear() &&
      r.date.getMonth() === today.getMonth() &&
      r.date.getDate() === today.getDate()
    );
  }).length;

  const completed = records.filter((r) => r.checkIn && r.checkOut);
  const avgMinutes =
    completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.checkOut!.getTime() - r.checkIn!.getTime()) / 60000, 0) / completed.length
      : null;

  return NextResponse.json({
    records,
    stats: {
      total: records.length,
      presentToday,
      avgMinutes,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const start = moliyaPeriodStart(period);

  const employees = await prisma.employee.findMany({
    where: { storeId: session.storeId, ...(employeeId ? { id: employeeId } : {}) },
    orderBy: { name: "asc" },
    include: {
      attendance: {
        where: { ...(start ? { date: { gte: start } } : {}) },
      },
    },
  });

  const rows = employees
    .map((e) => {
      const completed = e.attendance.filter((a) => a.checkIn && a.checkOut);
      const hours = completed.reduce((sum, a) => sum + (a.checkOut!.getTime() - a.checkIn!.getTime()) / 3600000, 0);
      const pay = Math.round(hours * e.hourlyRate);
      return { id: e.id, name: e.name, hours, hourlyRate: e.hourlyRate, pay };
    })
    .filter((r) => r.hours > 0 || employeeId);

  const totals = {
    employeeCount: rows.length,
    totalHours: rows.reduce((sum, r) => sum + r.hours, 0),
    totalPay: rows.reduce((sum, r) => sum + r.pay, 0),
  };

  return NextResponse.json({ rows, totals });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart, startOfDay } from "@/lib/stats";

const MONTHLY_DIVISOR = 30;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const periodStart = startOfDay(moliyaPeriodStart(period) ?? new Date());
  const today = startOfDay(new Date());

  const employees = await prisma.employee.findMany({
    where: { storeId: session.storeId, ...(employeeId ? { id: employeeId } : {}) },
    orderBy: { name: "asc" },
    include: {
      attendance: {
        where: { date: { gte: periodStart, lte: today }, status: { in: ["PRESENT", "LATE"] } },
      },
    },
  });

  // Salary already paid out inside the selected period.
  const paidAgg = await prisma.salaryPayment.groupBy({
    by: ["employeeId"],
    where: {
      storeId: session.storeId,
      employeeId: { in: employees.map((e) => e.id) },
      createdAt: { gte: periodStart },
    },
    _sum: { amount: true },
  });
  const paidMap = new Map(paidAgg.map((a) => [a.employeeId, a._sum.amount ?? 0]));

  const rows = employees.map((e) => {
    const rangeStart = startOfDay(e.createdAt) > periodStart ? startOfDay(e.createdAt) : periodStart;
    const elapsedDays = Math.max(0, Math.round((today.getTime() - rangeStart.getTime()) / 86400000) + 1);
    const presentDays = Math.min(e.attendance.length, elapsedDays);
    const absentDays = Math.max(0, elapsedDays - presentDays);
    const dailyRate = e.salaryType === "DAILY" ? e.salary : Math.round(e.salary / MONTHLY_DIVISOR);
    const deduction = absentDays * dailyRate;
    const pay = dailyRate * presentDays;
    const paid = paidMap.get(e.id) ?? 0;
    return {
      id: e.id,
      name: e.name,
      salaryType: e.salaryType,
      salary: e.salary,
      presentDays,
      absentDays,
      deduction,
      pay,
      paid,
      remaining: Math.max(0, pay - paid),
    };
  });

  const totals = {
    employeeCount: rows.length,
    totalAbsentDays: rows.reduce((sum, r) => sum + r.absentDays, 0),
    totalPay: rows.reduce((sum, r) => sum + r.pay, 0),
    totalPaid: rows.reduce((sum, r) => sum + r.paid, 0),
  };

  return NextResponse.json({ rows, totals });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart, startOfDay } from "@/lib/stats";
import { autoCloseOpenShifts } from "@/lib/attendance";

const MONTHLY_DIVISOR = 30;

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// How much of the scheduled shift an attendance record actually covers, as a
// fraction in [0, 1]. Missing clock-out data or no configured schedule means
// there's nothing to compare against, so it counts as a full day — this only
// docks pay when we can actually see the employee arrived late or left early.
function shiftFraction(
  checkIn: Date | null,
  checkOut: Date | null,
  startTime: string | null,
  endTime: string | null
): number {
  if (!startTime || !endTime || !checkIn || !checkOut) return 1;
  const schedStart = parseTimeToMinutes(startTime);
  const schedEnd = parseTimeToMinutes(endTime);
  if (schedStart == null || schedEnd == null || schedEnd <= schedStart) return 1;

  const inMin = checkIn.getHours() * 60 + checkIn.getMinutes();
  const outMin = checkOut.getHours() * 60 + checkOut.getMinutes();
  const overlap = Math.max(0, Math.min(outMin, schedEnd) - Math.max(inMin, schedStart));
  const scheduled = schedEnd - schedStart;
  return Math.min(1, overlap / scheduled);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  await autoCloseOpenShifts(session.storeId);

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

    let pay: number;
    let deduction = 0;
    let partialDays = 0;
    let partialDeduction = 0;
    let totalHours: number | undefined;

    if (e.salaryType === "HOURLY") {
      // Hourly pay already reflects exactly how long each shift was, so there's
      // no separate day-based deduction to compute — absent days simply don't
      // contribute hours.
      totalHours = e.attendance.reduce((sum, att) => {
        if (!att.checkIn || !att.checkOut) return sum;
        const hours = (att.checkOut.getTime() - att.checkIn.getTime()) / 3_600_000;
        return sum + Math.max(0, hours);
      }, 0);
      pay = Math.round(e.salary * totalHours);
    } else {
      const dailyRate = e.salaryType === "DAILY" ? e.salary : Math.round(e.salary / MONTHLY_DIVISOR);
      deduction = absentDays * dailyRate;
      for (const att of e.attendance) {
        const fraction = shiftFraction(att.checkIn, att.checkOut, e.workStartTime, e.workEndTime);
        if (fraction < 1) {
          partialDays += 1;
          partialDeduction += Math.round(dailyRate * (1 - fraction));
        }
      }
      pay = dailyRate * presentDays - partialDeduction;
    }

    const paid = paidMap.get(e.id) ?? 0;
    return {
      id: e.id,
      name: e.name,
      salaryType: e.salaryType,
      salary: e.salary,
      presentDays,
      absentDays,
      deduction,
      partialDays,
      partialDeduction,
      pay,
      paid,
      remaining: Math.max(0, pay - paid),
      ...(totalHours != null ? { totalHours: Math.round(totalHours * 100) / 100 } : {}),
    };
  });

  const totals = {
    employeeCount: rows.length,
    totalAbsentDays: rows.reduce((sum, r) => sum + r.absentDays, 0),
    totalPartialDeduction: rows.reduce((sum, r) => sum + r.partialDeduction, 0),
    totalPay: rows.reduce((sum, r) => sum + r.pay, 0),
    totalPaid: rows.reduce((sum, r) => sum + r.paid, 0),
  };

  return NextResponse.json({ rows, totals });
}

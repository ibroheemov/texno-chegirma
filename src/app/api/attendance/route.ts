import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { moliyaPeriodStart } from "@/lib/stats";
import { parseAttendanceEdit, parseDayKey } from "@/lib/attendanceEdit";

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

// Admin-only: add an attendance record by hand (e.g. the employee forgot to
// mark it). Replaces any existing record for that employee and day.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.role === "EMPLOYEE") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const employee = await prisma.employee.findFirst({
    where: { id: String(body.employeeId ?? ""), storeId: session.storeId },
  });
  if (!employee) return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  const day = parseDayKey(body.date);
  if (!day) return NextResponse.json({ error: "Sanani tanlang" }, { status: 400 });
  const parsed = parseAttendanceEdit(day, body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  const existing = await prisma.attendance.findFirst({
    where: { employeeId: employee.id, date: { gte: day, lt: next } },
  });
  const attendance = existing
    ? await prisma.attendance.update({ where: { id: existing.id }, data: parsed })
    : await prisma.attendance.create({ data: { employeeId: employee.id, date: day, ...parsed } });
  return NextResponse.json({ attendance }, { status: existing ? 200 : 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { startOfDay } from "@/lib/stats";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const today = startOfDay(new Date());
  const [total, todayAttendance] = await Promise.all([
    prisma.employee.count({ where: { storeId: session.storeId } }),
    prisma.attendance.findMany({
      where: { employee: { storeId: session.storeId }, date: today, status: "PRESENT" },
    }),
  ]);

  const presentToday = todayAttendance.length;
  const onShiftNow = todayAttendance.filter((a) => a.checkIn && !a.checkOut).length;
  const absentToday = Math.max(0, total - presentToday);

  return NextResponse.json({ total, presentToday, onShiftNow, absentToday });
}

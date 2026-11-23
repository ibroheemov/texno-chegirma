import { prisma } from "./prisma";
import { startOfDay } from "./stats";

function endOfShift(date: Date, workEndTime: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(workEndTime);
  if (!m) return null;
  const d = new Date(date);
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/**
 * An employee who forgets to tap "Chiqish" would otherwise stay "on shift"
 * forever (and hourly pay would skip that day). Once the scheduled end time
 * has passed, close the shift at that time. Employees without a schedule
 * can't be auto-closed — those are surfaced for the admin to fix by hand
 * (see findUnclosedShifts).
 */
export async function autoCloseOpenShifts(storeId: string) {
  const now = new Date();
  const open = await prisma.attendance.findMany({
    where: {
      checkIn: { not: null },
      checkOut: null,
      date: { lte: startOfDay(now) },
      employee: { storeId, workEndTime: { not: null } },
    },
    include: { employee: { select: { workEndTime: true } } },
  });
  for (const a of open) {
    const end = endOfShift(a.date, a.employee.workEndTime!);
    if (end && a.checkIn && end > a.checkIn && end <= now) {
      await prisma.attendance.update({ where: { id: a.id }, data: { checkOut: end } });
    }
  }
}

/** Past days with a check-in but no check-out that couldn't be auto-closed. */
export async function findUnclosedShifts(storeId: string) {
  return prisma.attendance.findMany({
    where: {
      checkIn: { not: null },
      checkOut: null,
      date: { lt: startOfDay(new Date()) },
      employee: { storeId },
    },
    orderBy: { date: "desc" },
    select: { employeeId: true, date: true },
  });
}

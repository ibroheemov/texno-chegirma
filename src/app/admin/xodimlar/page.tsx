import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/stats";
import { autoCloseOpenShifts, findUnclosedShifts } from "@/lib/attendance";
import { XodimlarTabs } from "@/components/employees/XodimlarTabs";
import type { EmployeeRow } from "@/components/employees/EmployeeTable";

export default async function XodimlarPage() {
  const session = await getSession();
  if (!session) return null;

  await autoCloseOpenShifts(session.storeId);
  const unclosed = await findUnclosedShifts(session.storeId);
  const unclosedByEmployee = new Map<string, Date>();
  for (const u of unclosed) if (!unclosedByEmployee.has(u.employeeId)) unclosedByEmployee.set(u.employeeId, u.date);

  const today = startOfDay(new Date());
  const employees = await prisma.employee.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { attendance: { where: { date: today } } },
  });

  const rows: EmployeeRow[] = employees.map((e) => ({
    ...e,
    presentToday: e.attendance.some((a) => a.status === "PRESENT"),
    onShift: e.attendance.some((a) => a.status === "PRESENT" && a.checkIn && !a.checkOut),
    unclosedDate: unclosedByEmployee.get(e.id)?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <XodimlarTabs employees={rows} />
    </div>
  );
}

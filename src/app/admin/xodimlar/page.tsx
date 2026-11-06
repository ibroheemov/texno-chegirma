import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/stats";
import { XodimlarTabs } from "@/components/employees/XodimlarTabs";
import type { EmployeeRow } from "@/components/employees/EmployeeTable";

export default async function XodimlarPage() {
  const session = await getSession();
  if (!session) return null;

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
  }));

  return (
    <div className="flex flex-col gap-6">
      <XodimlarTabs employees={rows} />
    </div>
  );
}

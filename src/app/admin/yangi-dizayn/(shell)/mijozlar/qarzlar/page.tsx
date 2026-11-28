import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QarzlarView, type DebtLedger } from "@/components/refine/mijozlar/QarzlarView";

export default async function NewDesignQarzlarPage() {
  const session = await getSession();
  if (!session) return null;

  const [ledgers, employees] = await Promise.all([
    prisma.creditLedger.findMany({
      where: { storeId: session.storeId },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.employee.findMany({
      where: { storeId: session.storeId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: DebtLedger[] = ledgers.map((l) => ({
    id: l.id,
    totalAmount: l.totalAmount,
    paidAmount: l.paidAmount,
    dueDate: l.dueDate.toISOString(),
    createdAt: l.createdAt.toISOString(),
    customer: l.customer,
  }));

  return <QarzlarView ledgers={rows} employees={employees} nowIso={new Date().toISOString()} />;
}

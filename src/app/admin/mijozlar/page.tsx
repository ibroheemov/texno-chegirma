import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MijozlarTabs } from "@/components/customers/MijozlarTabs";
import type { CustomerRow } from "@/lib/types";

export default async function MijozlarPage() {
  const session = await getSession();
  if (!session) return null;

  const customers = await prisma.customer.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { sales: true, debts: true },
  });

  const now = new Date();
  const soonCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const rows: CustomerRow[] = customers.map((c) => {
    const unpaid = c.debts.filter((d) => d.paidAmount < d.totalAmount);
    const overdue = unpaid.some((d) => new Date(d.dueDate) < now);
    const dueSoon = !overdue && unpaid.some((d) => new Date(d.dueDate) <= soonCutoff);
    return {
      ...c,
      totalSpent: c.sales.reduce((sum, s) => sum + s.total, 0),
      debt: c.debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0),
      ordersCount: c.sales.length,
      overdue,
      dueSoon,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <MijozlarTabs customers={rows} />
    </div>
  );
}

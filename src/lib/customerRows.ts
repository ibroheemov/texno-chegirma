import { prisma } from "@/lib/prisma";
import { normalizeColor, type SegmentColor } from "@/lib/customerSegments";

export type SegmentRef = { id: string; name: string; color: SegmentColor };

/** Customer row for New design -> Mijozlar pages (serializable for client components). */
export type NdCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  createdAt: string;
  fromTelegram: boolean;
  group: SegmentRef | null;
  tags: SegmentRef[];
  /** Non-canceled sales only. */
  ordersCount: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  debt: number;
  overdue: boolean;
  dueSoon: boolean;
};

export async function getCustomerRows(storeId: string): Promise<NdCustomerRow[]> {
  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    include: {
      sales: { where: { canceled: false }, select: { total: true, createdAt: true } },
      debts: { select: { totalAmount: true, paidAmount: true, dueDate: true } },
      group: { select: { id: true, name: true, color: true } },
      tags: { select: { id: true, name: true, color: true }, orderBy: { name: "asc" } },
    },
  });

  const now = new Date();
  const soonCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return customers.map((c) => {
    const unpaid = c.debts.filter((d) => d.paidAmount < d.totalAmount);
    const overdue = unpaid.some((d) => d.dueDate < now);
    const dueSoon = !overdue && unpaid.some((d) => d.dueDate <= soonCutoff);
    const last = c.sales.reduce<Date | null>((max, s) => (!max || s.createdAt > max ? s.createdAt : max), null);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      note: c.note,
      createdAt: c.createdAt.toISOString(),
      fromTelegram: !!c.telegramChatId,
      group: c.group ? { ...c.group, color: normalizeColor(c.group.color) } : null,
      tags: c.tags.map((t) => ({ ...t, color: normalizeColor(t.color) })),
      ordersCount: c.sales.length,
      totalSpent: c.sales.reduce((sum, s) => sum + s.total, 0),
      lastPurchaseAt: last ? last.toISOString() : null,
      debt: c.debts.reduce((sum, d) => sum + Math.max(0, d.totalAmount - d.paidAmount), 0),
      overdue,
      dueSoon,
    };
  });
}

export async function getSegments(storeId: string) {
  const [groups, tags] = await Promise.all([
    prisma.customerGroup.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: { _count: { select: { customers: true } } },
    }),
    prisma.customerTag.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: { _count: { select: { customers: true } } },
    }),
  ]);
  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: normalizeColor(g.color),
      description: g.description,
      count: g._count.customers,
    })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: normalizeColor(t.color), count: t._count.customers })),
  };
}

export type GroupRow = Awaited<ReturnType<typeof getSegments>>["groups"][number];
export type TagRow = Awaited<ReturnType<typeof getSegments>>["tags"][number];

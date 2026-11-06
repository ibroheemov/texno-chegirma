import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDaySummary } from "@/lib/stats";
import { KassaStats } from "@/components/pos/KassaStats";
import { PosView } from "@/components/pos/PosView";
import { PendingOrders } from "@/components/orders/PendingOrders";

export default async function KassaPage() {
  const session = await getSession();
  if (!session) return null;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [summary, prevSummary, products, categories, customers, stockLevels, store] = await Promise.all([
    getDaySummary(session.storeId, today),
    getDaySummary(session.storeId, yesterday),
    prisma.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
      take: 24,
      include: { category: true },
    }),
    prisma.category.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { storeId: session.storeId },
      select: { stock: true, lowStockAt: true },
    }),
    prisma.store.findUnique({ where: { id: session.storeId } }),
  ]);

  const totalProducts = stockLevels.length;
  const outCount = stockLevels.filter((p) => p.stock <= 0).length;
  const lowCount = stockLevels.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;
  const availableCount = totalProducts - outCount - lowCount;

  return (
    <div className="flex flex-col gap-6">
      <KassaStats
        initialSummary={summary}
        prevSummary={{ totalSales: prevSummary.totalSales, totalProfit: prevSummary.totalProfit }}
        totalProducts={totalProducts}
        available={availableCount}
        low={lowCount}
        out={outCount}
      />

      {store?.notifyNewOrders !== false && <PendingOrders soundAlert={store?.soundAlert ?? true} />}

      <PosView
        initialProducts={products}
        categories={categories}
        customers={customers}
        enableMixedPayment={store?.enableMixedPayment ?? true}
        receipt={{
          storeName: store?.name ?? "",
          phone: store?.phone ?? null,
          address: store?.address ?? null,
          logoUrl: store?.logoUrl ?? null,
          telegramUsername: store?.telegramUsername ?? null,
          footer: store?.receiptFooter ?? null,
          autoPrint: store?.autoPrintReceipt ?? false,
        }}
      />
    </div>
  );
}

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDaySummary } from "@/lib/stats";
import { syncUsdPrices } from "@/lib/usdRate";
import { KassaStats } from "@/components/pos/KassaStats";
import { PosView } from "@/components/pos/PosView";
import { PendingOrders } from "@/components/orders/PendingOrders";

export default async function KassaPage() {
  const session = await getSession();
  if (!session) return null;

  await syncUsdPrices(session.storeId);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [summary, prevSummary, products, categories, customers, store, employees, currentUser] = await Promise.all([
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
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.employee.findMany({
      where: { storeId: session.storeId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ]);

  const receiptSettings = {
    storeName: store?.name ?? "",
    phone: store?.phone ?? null,
    address: store?.address ?? null,
    logoUrl: store?.logoUrl || "/logo.png",
    telegramUsername: store?.telegramUsername ?? null,
    footer: store?.receiptFooter ?? null,
    autoPrint: store?.autoPrintReceipt ?? false,
  };

  return (
    <div className="flex flex-col gap-6">
      <KassaStats
        initialSummary={summary}
        prevSummary={{ totalSales: prevSummary.totalSales, totalProfit: prevSummary.totalProfit }}
        receipt={receiptSettings}
      />

      {store?.notifyNewOrders !== false && <PendingOrders soundAlert={store?.soundAlert ?? true} />}

      <PosView
        initialProducts={products}
        categories={categories}
        customers={customers}
        employees={employees}
        currentUserName={currentUser?.name ?? "Men"}
        enableMixedPayment={store?.enableMixedPayment ?? true}
        customPaymentMethods={Array.isArray(store?.customPaymentMethods) ? (store.customPaymentMethods as string[]) : []}
        deferredPaymentMethods={
          store?.deferredPaymentMethods && typeof store.deferredPaymentMethods === "object"
            ? (store.deferredPaymentMethods as Record<string, number>)
            : {}
        }
        receipt={receiptSettings}
      />
    </div>
  );
}

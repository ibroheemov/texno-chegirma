import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInventorySummary } from "@/lib/stats";
import { getUsdRate, syncUsdPrices } from "@/lib/usdRate";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";

export default async function OmborPage() {
  const session = await getSession();
  if (!session) return null;

  await syncUsdPrices(session.storeId);

  const [products, categories, summary, store] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.category.findMany({ where: { storeId: session.storeId }, orderBy: { name: "asc" } }),
    getInventorySummary(session.storeId),
    prisma.store.findUnique({ where: { id: session.storeId } }),
  ]);
  const usdRateInfo = await getUsdRate(store?.usdRate);

  return (
    <div className="flex flex-col gap-6">
      <InventorySummaryCards
        totalCostValue={summary.totalCostValue}
        totalSaleValue={summary.totalSaleValue}
        usdRateInfo={usdRateInfo}
      />
      <InventoryTable initialProducts={products} categories={categories} usdRate={usdRateInfo?.rate ?? store?.usdRate} />
    </div>
  );
}

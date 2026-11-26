import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInventorySummary } from "@/lib/stats";
import { getUsdRate, syncUsdPrices } from "@/lib/usdRate";
import { OmborView } from "@/components/refine/OmborView";

export default async function NewDesignOmborPage() {
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
  const usdRateInfo = await getUsdRate(session.storeId);

  return (
    <OmborView
      initialProducts={products}
      categories={categories}
      totalCostValue={summary.totalCostValue}
      totalSaleValue={summary.totalSaleValue}
      usdRateInfo={usdRateInfo}
      usdRate={usdRateInfo?.rate ?? store?.usdRate}
    />
  );
}

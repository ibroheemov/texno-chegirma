import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { syncUsdPrices } from "@/lib/usdRate";
import { MoliyaTabs } from "@/components/finance/MoliyaTabs";

export default async function MoliyaPage() {
  const session = await getSession();
  if (!session) return null;

  await syncUsdPrices(session.storeId);

  const [products, store, customers] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    }),
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.customer.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <MoliyaTabs
        products={products}
        customers={customers}
        usdRate={store?.usdRate}
        showDebtInUsdOnly={store?.showDebtInUsdOnly}
      />
    </div>
  );
}

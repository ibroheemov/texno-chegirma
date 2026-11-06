import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MoliyaTabs } from "@/components/finance/MoliyaTabs";

export default async function MoliyaPage() {
  const session = await getSession();
  if (!session) return null;

  const [products, store] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    }),
    prisma.store.findUnique({ where: { id: session.storeId } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <MoliyaTabs products={products} usdRate={store?.usdRate} showDebtInUsdOnly={store?.showDebtInUsdOnly} />
    </div>
  );
}

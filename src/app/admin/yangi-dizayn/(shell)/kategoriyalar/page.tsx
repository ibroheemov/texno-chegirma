import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KategoriyalarView, type CategoryRow } from "@/components/refine/KategoriyalarView";

export default async function NewDesignKategoriyalarPage() {
  const session = await getSession();
  if (!session) return null;

  const [categories, totalProducts, uncategorized] = await Promise.all([
    prisma.category.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.count({ where: { storeId: session.storeId } }),
    prisma.product.count({ where: { storeId: session.storeId, categoryId: null } }),
  ]);

  const rows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    productCount: c._count.products,
  }));

  return <KategoriyalarView initialCategories={rows} totalProducts={totalProducts} uncategorized={uncategorized} />;
}

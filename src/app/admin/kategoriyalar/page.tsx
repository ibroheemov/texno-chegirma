import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryList, type CategoryRow } from "@/components/categories/CategoryList";

export default async function KategoriyalarPage() {
  const session = await getSession();
  if (!session) return null;

  const categories = await prisma.category.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const rows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    productCount: c._count.products,
  }));

  return (
    <div className="flex flex-col gap-6">
      <CategoryList initialCategories={rows} />
    </div>
  );
}
